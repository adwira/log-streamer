const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS n8n_logs_executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT,
        workflow_name TEXT,
        status TEXT,
        started_at BIGINT,
        finished_at BIGINT,
        duration_ms INTEGER
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS n8n_logs_logs (
        id SERIAL PRIMARY KEY,
        execution_id TEXT REFERENCES n8n_logs_executions(id) ON DELETE CASCADE,
        timestamp BIGINT,
        level TEXT,
        node_name TEXT,
        message TEXT,
        message_id TEXT,
        raw TEXT
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_n8n_logs_logs_exec_id ON n8n_logs_logs(execution_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_n8n_logs_executions_started ON n8n_logs_executions(started_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_n8n_logs_executions_status ON n8n_logs_executions(status);`);
  } finally {
    client.release();
  }
}

async function upsertExecution({ id, workflowId, workflowName, status, startedAt, finishedAt }) {
  if (!id) return;
  
  // Hitung duration jika startedAt dan finishedAt tersedia
  // Karena upsert dapat dipanggil beberapa kali, kita gunakan query khusus
  const query = `
    INSERT INTO n8n_logs_executions (id, workflow_id, workflow_name, status, started_at, finished_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET
      workflow_id = COALESCE(EXCLUDED.workflow_id, n8n_logs_executions.workflow_id),
      workflow_name = COALESCE(EXCLUDED.workflow_name, n8n_logs_executions.workflow_name),
      status = EXCLUDED.status,
      started_at = COALESCE(EXCLUDED.started_at, n8n_logs_executions.started_at),
      finished_at = COALESCE(EXCLUDED.finished_at, n8n_logs_executions.finished_at),
      duration_ms = CASE 
        WHEN EXCLUDED.finished_at IS NOT NULL AND n8n_logs_executions.started_at IS NOT NULL 
        THEN (EXCLUDED.finished_at - n8n_logs_executions.started_at)
        WHEN EXCLUDED.finished_at IS NOT NULL AND EXCLUDED.started_at IS NOT NULL 
        THEN (EXCLUDED.finished_at - EXCLUDED.started_at)
        ELSE n8n_logs_executions.duration_ms
      END
  `;
  await pool.query(query, [id, workflowId, workflowName, status, startedAt, finishedAt]);
}

async function insertLog({ executionId, timestamp, level, nodeName, message, messageId, raw }) {
  if (!executionId) return;

  // Pastikan execution ada (sebagai placeholder jika belum)
  await pool.query(`
    INSERT INTO n8n_logs_executions (id, status)
    VALUES ($1, 'running')
    ON CONFLICT (id) DO NOTHING
  `, [executionId]);

  const query = `
    INSERT INTO n8n_logs_logs (execution_id, timestamp, level, node_name, message, message_id, raw)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  await pool.query(query, [executionId, timestamp, level, nodeName, message, messageId, raw]);
}

async function getExecutions({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const result = await pool.query(`
    SELECT * FROM n8n_logs_executions 
    ORDER BY started_at DESC NULLS LAST
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  
  const countResult = await pool.query('SELECT COUNT(*) FROM n8n_logs_executions');
  const total = parseInt(countResult.rows[0].count, 10);
  
  return {
    data: result.rows,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
}

async function getExecutionWithLogs(id) {
  const execResult = await pool.query('SELECT * FROM n8n_logs_executions WHERE id = $1', [id]);
  if (execResult.rows.length === 0) return null;
  
  const logsResult = await pool.query('SELECT * FROM n8n_logs_logs WHERE execution_id = $1 ORDER BY timestamp ASC', [id]);
  
  return {
    execution: execResult.rows[0],
    logs: logsResult.rows
  };
}

async function getActiveExecutions() {
  const result = await pool.query(`
    SELECT * FROM n8n_logs_executions 
    WHERE status = 'running' 
    ORDER BY started_at DESC NULLS LAST
  `);
  
  // Get recent logs for each active execution (for the node context)
  const activeExecutions = result.rows;
  for (const exec of activeExecutions) {
    const logsRes = await pool.query(`
      SELECT * FROM n8n_logs_logs 
      WHERE execution_id = $1 
      ORDER BY timestamp DESC LIMIT 5
    `, [exec.id]);
    exec.logs = logsRes.rows.reverse(); // Reverse to chronological order
    
    // Find current node
    const currentNodeLog = logsRes.rows.find(l => l.message_id === 'node_executing');
    exec.currentNode = currentNodeLog ? currentNodeLog.node_name : null;
  }
  
  return activeExecutions;
}

async function cleanupOldLogs(retentionDays) {
  const thresholdMs = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  
  // Delete logs with cascade from executions table
  await pool.query(`
    DELETE FROM n8n_logs_executions 
    WHERE started_at < $1 OR (started_at IS NULL AND finished_at < $1)
  `, [thresholdMs]);
}

// Backfill workflow_name for executions that don't have one yet
async function patchWorkflowName(executionId, workflowName) {
  if (!executionId || !workflowName) return;
  await pool.query(`
    UPDATE n8n_logs_executions
    SET workflow_name = $2
    WHERE id = $1 AND (workflow_name IS NULL OR workflow_name = '')
  `, [executionId, workflowName]);
}

module.exports = { migrate, upsertExecution, insertLog, getExecutions, getExecutionWithLogs, getActiveExecutions, cleanupOldLogs, patchWorkflowName };
