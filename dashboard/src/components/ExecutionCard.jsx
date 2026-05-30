import React, { useState, useEffect } from 'react';
import LogStream from './LogStream';
import { formatTime, formatElapsed } from '../utils/timeFormatter';

function ExecutionCard({ execution }) {
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!execution.started_at) return;
    
    // Update elapsed time every second
    const updateElapsed = () => {
      setElapsed(formatElapsed(parseInt(execution.started_at)));
    };
    
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [execution.started_at]);

  const startedTime = execution.started_at ? formatTime(parseInt(execution.started_at)) : '--:--';
  const currentNode = execution.currentNode;

  return (
    <div className="card">
      <div className="card-header">
        <div className="workflow-name">
          <span>🔄</span> {execution.workflow_name || 'Unknown Workflow'}
        </div>
        <div className="workflow-meta">
          <div>Mulai {startedTime}</div>
          <div style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>{elapsed}</div>
        </div>
      </div>
      
      {currentNode && (
        <div className="current-node">
          Langkah aktif: {currentNode}
        </div>
      )}
      
      <LogStream 
        logs={execution.logs || []} 
        maxVisible={expanded ? 1000 : 5} 
      />
      
      {(execution.logs || []).length > 5 && (
        <button 
          className="btn-text" 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▲ Sembunyikan' : '▼ Lihat semua log'}
        </button>
      )}
    </div>
  );
}

export default ExecutionCard;
