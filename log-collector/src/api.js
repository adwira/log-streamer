const express = require('express');
const cors = require('cors');
const http = require('http');
const db = require('./db');

function startApiServer(port) {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/api/executions', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await db.getExecutions({ page, limit });
      res.json(result);
    } catch (err) {
      console.error('Error fetching executions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/executions/active', async (req, res) => {
    try {
      const active = await db.getActiveExecutions();
      res.json({ data: active });
    } catch (err) {
      console.error('Error fetching active executions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/executions/:id', async (req, res) => {
    try {
      const result = await db.getExecutionWithLogs(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      res.json(result);
    } catch (err) {
      console.error('Error fetching execution details:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const server = http.createServer(app);
  
  server.listen(port, () => {
    console.log(`API and WebSocket server listening on port ${port}`);
  });

  return server;
}

module.exports = { startApiServer };
