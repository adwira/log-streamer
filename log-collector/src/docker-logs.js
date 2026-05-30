const http = require('http');
const logParser = require('./log-parser');
const db = require('./db');
const { broadcastLog, broadcastExecutionStarted, broadcastExecutionFinished } = require('./websocket');

const CONTAINER_NAME = process.env.N8N_CONTAINER_NAME || 'n8n';
const MAX_RETRIES = 5;

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
    retryCount = 0; // Reset retry count on successful connection

    let buffer = Buffer.alloc(0);

    res.on('data', async (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      
      // Handle Docker log multiplexing format
      while (buffer.length >= 8) {
        // Byte 0: stream type (1=stdout, 2=stderr)
        // Byte 4-7: payload length (big-endian uint32)
        const payloadLength = buffer.readUInt32BE(4);
        const frameLength = 8 + payloadLength;
        
        if (buffer.length < frameLength) {
          // Not enough data for the full frame yet
          break;
        }

        const payloadBuffer = buffer.subarray(8, frameLength);
        const payloadStr = payloadBuffer.toString('utf8');
        
        // Remove parsed frame from buffer
        buffer = buffer.subarray(frameLength);
        
        // Process the lines (there could be multiple lines or parts in one frame)
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
    // Determine status
    let status = 'running';
    if (parsed.messageId === 'workflow_completed') status = 'completed';
    if (parsed.messageId === 'workflow_error') status = 'error';

    // 1. Insert/Update execution record if there is an executionId
    if (parsed.executionId) {
      // Calculate duration manually if not provided, or simply rely on started/finished timestamps in db
      const executionData = {
        id: parsed.executionId,
        workflowId: parsed.workflowId,
        workflowName: parsed.workflowName,
        status: status,
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
        
        // Broadcast execution finished
        const wsPayload = {
          type: 'execution_finished',
          executionId: parsed.executionId,
          status: status
        };
        if (status === 'error') {
          wsPayload.errorMessage = parsed.errorMessage || 'Unknown error';
        }
        
        // Duration logic could be enhanced if we fetch started_at from DB
        broadcastExecutionFinished(wsPayload);
      }

      await db.upsertExecution(executionData);
      
      // 2. Insert log entry
      await db.insertLog(parsed);
      
      // 3. Broadcast log entry via WebSocket
      broadcastLog({
        type: 'log_entry',
        executionId: parsed.executionId,
        timestamp: parsed.timestamp,
        level: parsed.level,
        nodeName: parsed.nodeName,
        messageId: parsed.messageId,
        message: parsed.message
      });
    }
  } catch (err) {
    console.error('Error processing log line:', err, line);
  }
}

function scheduleReconnect() {
  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  const backoff = Math.min(Math.pow(2, retryCount) * 1000, 30000);
  retryCount++;
  console.log(`Reconnecting to Docker logs in ${backoff}ms... (Attempt ${retryCount})`);
  setTimeout(startDockerLogsListener, backoff);
}

module.exports = { startDockerLogsListener };
