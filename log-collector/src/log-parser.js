// In-memory maps for resolving context across log lines
const activeWorkflows = {};       // workflowId -> executionId
const executionWorkflowNames = {}; // executionId -> workflowName

// Extract workflow name from n8n log messages
function extractWorkflowName(msg) {
  // Pattern: 'Execution for workflow My workflow was assigned id 1831'
  let m = msg.match(/Execution for workflow (.+?) was assigned id/);
  if (m) return m[1].trim();

  // Pattern: 'Started execution of workflow "My workflow" from ...'
  m = msg.match(/Started execution of workflow "(.+?)"/);
  if (m) return m[1].trim();

  // Pattern: 'Resuming workflow "My workflow"'
  m = msg.match(/Resuming workflow "(.+?)"/);
  if (m) return m[1].trim();

  return null;
}

// Extract node name from n8n log messages
function extractNodeName(msg) {
  // Pattern: 'Start executing node "Webhook"'  or 'Running node "AI Agent" started'
  const m = msg.match(/(?:executing|node) "(.+?)"/i);
  return m ? m[1].trim() : null;
}

// Classify message into a semantic category
function classifyMessage(msg) {
  if (/Workflow execution started/i.test(msg)) return 'workflow_started';
  if (/Workflow execution finished successfully/i.test(msg)) return 'workflow_completed';
  if (/Workflow execution failed/i.test(msg)) return 'workflow_error';
  if (/Execution finalized/i.test(msg)) return 'workflow_completed';
  if (/Execution removed/i.test(msg)) return 'execution_removed';

  if (/Start executing node/i.test(msg)) return 'node_start';
  if (/Running node .+ started/i.test(msg)) return 'node_started';
  if (/Running node .+ finished successfully/i.test(msg)) return 'node_success';
  if (/Running node .+ failed/i.test(msg)) return 'node_error';

  if (/Execution (?:for workflow|ID \d+ had|added)/i.test(msg)) return 'execution_init';
  if (/Started execution of workflow/i.test(msg)) return 'workflow_launched';
  if (/Executing hook/i.test(msg)) return 'hook_executing';
  if (/Save execution data/i.test(msg)) return 'db_save';
  if (/Waiting for trigger/i.test(msg)) return 'waiting_trigger';

  return 'generic';
}

function parseLog(rawLine) {
  try {
    const data = JSON.parse(rawLine);

    // Level: supports pino-style numbers or n8n's string level
    let levelStr = 'info';
    if (typeof data.level === 'number') {
      if (data.level <= 10) levelStr = 'trace';
      else if (data.level <= 20) levelStr = 'debug';
      else if (data.level <= 30) levelStr = 'info';
      else if (data.level <= 40) levelStr = 'warn';
      else if (data.level <= 50) levelStr = 'error';
      else levelStr = 'fatal';
    } else if (typeof data.level === 'string') {
      levelStr = data.level.toLowerCase();
    }

    const msg = data.msg || data.message || '';
    const meta = data.metadata || {};
    const messageId = classifyMessage(msg);

    let errorMessage = null;
    if (data.error?.message) errorMessage = data.error.message;

    let timestamp = Date.now();
    if (data.time) timestamp = data.time;
    else if (meta.timestamp) timestamp = new Date(meta.timestamp).getTime();

    let executionId = data.executionId || meta.executionId || null;
    const workflowId = data.workflowId || meta.workflowId || null;

    // Resolve executionId from workflowId if missing
    if (executionId && workflowId) {
      activeWorkflows[workflowId] = executionId;
    } else if (!executionId && workflowId && activeWorkflows[workflowId]) {
      executionId = activeWorkflows[workflowId];
    }

    // Extract workflowName from message text if not in JSON fields
    let workflowName = data.workflowName || meta.workflowName || null;
    if (!workflowName) {
      workflowName = extractWorkflowName(msg);
    }
    // Cache it so later log lines without it can use it
    if (workflowName && executionId) {
      executionWorkflowNames[executionId] = workflowName;
    } else if (!workflowName && executionId && executionWorkflowNames[executionId]) {
      workflowName = executionWorkflowNames[executionId];
    }

    // Extract node name from message text if not in JSON fields
    let nodeName = data.nodeName || meta.nodeName || extractNodeName(msg) || null;

    return {
      timestamp,
      level: levelStr,
      executionId,
      workflowId,
      workflowName,
      nodeName,
      message: msg,
      messageId,
      errorMessage,
      raw: rawLine
    };
  } catch (err) {
    return {
      timestamp: Date.now(),
      level: 'info',
      executionId: null,
      workflowId: null,
      workflowName: null,
      nodeName: null,
      message: rawLine,
      messageId: 'raw_log',
      errorMessage: null,
      raw: rawLine
    };
  }
}

module.exports = { parseLog, executionWorkflowNames };
