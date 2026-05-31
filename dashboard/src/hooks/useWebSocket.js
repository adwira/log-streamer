import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url) {
  const [connected, setConnected] = useState(false);
  // allExecutions: semua execution (aktif maupun selesai) digabung, terbaru di atas
  const [allExecutions, setAllExecutions] = useState([]);
  
  const ws = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 10;

  // Helper: merge dan urutkan semua execution terbaru di atas
  const mergeAndSort = (executions) => {
    return [...executions].sort((a, b) => {
      const tsA = parseInt(a.started_at || 0);
      const tsB = parseInt(b.started_at || 0);
      return tsB - tsA; // descending
    });
  };

  const connect = () => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      retryCount.current = 0;
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      scheduleReconnect();
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.current.close();
    };
  };

  const scheduleReconnect = () => {
    if (retryCount.current >= maxRetries) return;
    const backoff = Math.min(Math.pow(2, retryCount.current) * 1000, 30000);
    retryCount.current += 1;
    console.log(`Reconnecting to WS in ${backoff}ms...`);
    setTimeout(connect, backoff);
  };

  const handleMessage = (data) => {
    switch (data.type) {
      case 'initial_state': {
        // Gabungkan active + recent dari initial state
        const active = (data.activeExecutions || []).map(e => ({ ...e, status: e.status || 'running' }));
        const recent = (data.recentExecutions || []);
        // Deduplicate by id, prefer active version if exists
        const byId = new Map();
        for (const e of recent) byId.set(e.id, e);
        for (const e of active) byId.set(e.id, e); // active overrides recent
        setAllExecutions(mergeAndSort([...byId.values()]));
        break;
      }

      case 'execution_started': {
        const newExec = {
          id: data.executionId,
          workflow_name: data.workflowName,
          started_at: data.startedAt,
          status: 'running',
          logs: [],
        };
        setAllExecutions(prev => {
          const filtered = prev.filter(e => e.id !== data.executionId);
          return mergeAndSort([newExec, ...filtered]);
        });
        break;
      }

      case 'execution_finished': {
        setAllExecutions(prev => {
          return mergeAndSort(prev.map(exec => {
            if (exec.id === data.executionId) {
              return {
                ...exec,
                status: data.status,
                duration_ms: data.durationMs,
                finished_at: Date.now(),
              };
            }
            return exec;
          }));
        });
        break;
      }

      case 'log_entry': {
        setAllExecutions(prev => prev.map(exec => {
          if (exec.id === data.executionId) {
            const newLog = {
              id: Date.now() + Math.random(),
              timestamp: data.timestamp,
              level: data.level,
              node_name: data.nodeName,
              message_id: data.messageId,
              message: data.message,
              workflow_name: data.workflowName,
            };

            const newLogs = [...(exec.logs || []), newLog];
            if (newLogs.length > 200) newLogs.shift();

            let currentNode = exec.currentNode;
            if (['node_start', 'node_started'].includes(data.messageId)) {
              currentNode = data.nodeName;
            }

            const workflowName = data.workflowName || exec.workflow_name;
            return { ...exec, logs: newLogs, currentNode, workflow_name: workflowName };
          }
          return exec;
        }));
        break;
      }
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [url]);

  // Limit to 50 most recent executions
  const displayExecutions = allExecutions.slice(0, 50);

  return { connected, allExecutions: displayExecutions };
}
