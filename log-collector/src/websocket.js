const WebSocket = require('ws');
const db = require('./db');

let wss = null;

function startWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws) => {
    console.log('Client connected to WebSocket');
    
    try {
      // Send initial state
      const activeExecutions = await db.getActiveExecutions();
      const recentExecutionsRes = await db.getExecutions({ page: 1, limit: 20 });
      
      ws.send(JSON.stringify({
        type: 'initial_state',
        activeExecutions,
        recentExecutions: recentExecutionsRes.data
      }));
    } catch (err) {
      console.error('Error sending initial state:', err);
    }

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}

function broadcastLog(logData) {
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(logData));
    }
  });
}

function broadcastExecutionStarted(data) {
  if (!wss) return;
  const payload = JSON.stringify({
    type: 'execution_started',
    ...data
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastExecutionFinished(data) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = { startWebSocketServer, broadcastLog, broadcastExecutionStarted, broadcastExecutionFinished };
