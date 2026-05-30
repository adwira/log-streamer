import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url) {
  const [connected, setConnected] = useState(false);
  const [activeExecutions, setActiveExecutions] = useState([]);
  const [recentExecutions, setRecentExecutions] = useState([]);
  
  const ws = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 5;

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
    const backoff = Math.min(Math.pow(2, retryCount.current) * 1000, 30000);
    retryCount.current += 1;
    console.log(`Reconnecting to WS in ${backoff}ms...`);
    setTimeout(connect, backoff);
  };

  const handleMessage = (data) => {
    switch (data.type) {
      case 'initial_state':
        setActiveExecutions(data.activeExecutions || []);
        setRecentExecutions(data.recentExecutions || []);
        break;
        
      case 'execution_started':
        setActiveExecutions(prev => {
          const newExec = {
            id: data.executionId,
            workflow_name: data.workflowName,
            started_at: data.startedAt,
            status: 'running',
            logs: []
          };
          return [newExec, ...prev.filter(e => e.id !== data.executionId)];
        });
        break;
        
      case 'execution_finished':
        setActiveExecutions(prev => {
          const finishedExec = prev.find(e => e.id === data.executionId);
          if (finishedExec) {
            // Move from active to recent
            const toRecent = {
              ...finishedExec,
              status: data.status,
              duration_ms: data.durationMs,
              finished_at: Date.now()
            };
            setRecentExecutions(recent => [toRecent, ...recent].slice(0, 20));
          }
          return prev.filter(e => e.id !== data.executionId);
        });
        break;
        
      case 'log_entry':
        setActiveExecutions(prev => prev.map(exec => {
          if (exec.id === data.executionId) {
            const newLogs = [...(exec.logs || []), {
              id: Date.now() + Math.random(), // pseudo id for React key
              timestamp: data.timestamp,
              level: data.level,
              node_name: data.nodeName,
              message_id: data.messageId,
              message: data.message
            }];
            
            // Keep maximum 100 logs in memory for active view
            if (newLogs.length > 100) {
              newLogs.shift();
            }
            
            let currentNode = exec.currentNode;
            if (data.messageId === 'node_executing') {
              currentNode = data.nodeName;
            }
            
            return { ...exec, logs: newLogs, currentNode };
          }
          return exec;
        }));
        break;
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return { connected, activeExecutions, recentExecutions };
}
