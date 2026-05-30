const http = require('http');
const logParser = require('./log-parser');
const db = require('./db');
const { broadcastLog, broadcastExecutionStarted, broadcastExecutionFinished } = require('./websocket');

const CONTAINER_NAME = process.env.N8N_CONTAINER_NAME || 'n8n';

let retryCount = 0;

function startDockerLogsListener() {
  const options = {
    socketPath: '/var/run/docker.sock',
    path: `/containers/${CONTAINER_NAME}/logs?follow=1&stdout=1&stderr=1&timestamps=0`,
    method: 'GET'
  };

  console.log(`Connecting to Docker daemon for container: ${CONTAINER_NAME}...`);

  const req = http.request(options, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Failed to attach to logs, status code: ${res.statusCode}`);
      scheduleReconnect();
      return;
    }

    console.log('Successfully connected to Docker logs stream.');
    retryCount = 0;

    let buffer = Buffer.alloc(0);

    res.on('data', async (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      
      while (buffer.length >= 8) {
        const payloadLength = buffer.readUInt32BE(4);
        const frameLength = 8 + payloadLength;
        
        if (buffer.length < frameLength) break;

        const payloadBuffer = buffer.subarray(8, frameLength);
        const payloadStr = payloadBuffer.toString('utf8');
        buffer = buffer.subarray(frameLength);
        
        const lines = payloadStr.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines) {
          await processLogLine(line);
        }
      }
    });

    res.on('end', () => {
      console.log('Docker logs stream ended.');
      scheduleReconnect();
    });

    res.on('error', (err) => {
      console.error('Error in Docker logs stream:', err);
      scheduleReconnect();
    });
  });

  req.on('error', (err) => {
    console.error(`Failed to connect to Docker socket: ${err.message}`);
    scheduleReconnect();
  });

  req.end();
}

async function processLogLine(line) {
  const parsed = logParser.parseLog(line);
  if (!parsed) return;

  try {
    let status = 'running';
    if (parsed.messageId === 'workflow_completed') status = 'completed';
    if (parsed.messageId === 'workflow_error') status = 'error';

    if (parsed.executionId) {
      const executionData = {
        id: parsed.executionId,
        workflowId: parsed.workflowId,
        workflowName: parsed.workflowName,
        status,
      };

      if (parsed.messageId === 'workflow_started') {
        executionData.startedAt = parsed.timestamp;
        broadcastExecutionStarted({
          executionId: parsed.executionId,
          workflowName: parsed.workflowName,
          startedAt: parsed.timestamp
        });
      } else if (status === 'completed' || status === 'error') {
        executionData.finishedAt = parsed.timestamp;
        broadcastExecutionFinished({
          type: 'execution_finished',
          executionId: parsed.executionId,
          status,
          errorMessage: parsed.errorMessage || null
        });
      }

      // If we extracted a workflow name (e.g., from message text), patch executions that had no name
      if (parsed.workflowName) {
        await db.patchWorkflowName(parsed.executionId, parsed.workflowName);
      }

      await db.upsertExecution(executionData);
      await db.insertLog(parsed);

      broadcastLog({
        type: 'log_entry',
        executionId: parsed.executionId,
        timestamp: parsed.timestamp,
        level: parsed.level,
        nodeName: parsed.nodeName,
        messageId: parsed.messageId,
        message: parsed.message,
        workflowName: parsed.workflowName
      });
    }
  } catch (err) {
    console.error('Error processing log line:', err.message);
  }
}

function scheduleReconnect() {
  const backoff = Math.min(Math.pow(2, retryCount) * 1000, 30000);
  retryCount++;
  console.log(`Reconnecting to Docker logs in ${backoff}ms... (Attempt ${retryCount})`);
  setTimeout(startDockerLogsListener, backoff);
}

module.exports = { startDockerLogsListener };
