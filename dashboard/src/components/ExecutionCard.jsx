import React, { useState, useEffect } from 'react';
import LogStream from './LogStream';
import { formatTime, formatElapsed } from '../utils/timeFormatter';

function ExecutionCard({ execution }) {
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!execution.started_at) return;
    const updateElapsed = () => setElapsed(formatElapsed(parseInt(execution.started_at)));
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [execution.started_at]);

  const startedTime = execution.started_at ? formatTime(parseInt(execution.started_at)) : '--:--';

  // Get the most recently active node
  const logs = execution.logs || [];
  const lastNodeLog = [...logs].reverse().find(l =>
    ['node_start', 'node_started'].includes(l.message_id || l.messageId)
  );
  const currentNode = lastNodeLog
    ? (lastNodeLog.node_name || lastNodeLog.nodeName)
    : null;

  // Workflow name fallback
  const workflowName = execution.workflow_name || execution.workflowName || 'Memuat...';

  return (
    <div className="card card--active">
      <div className="card-header">
        <div className="workflow-name">
          <span className="spinning">🔄</span>
          <span>{workflowName}</span>
        </div>
        <div className="workflow-meta">
          <div>Mulai <strong>{startedTime}</strong></div>
          {elapsed && <div className="elapsed-badge">{elapsed}</div>}
        </div>
      </div>

      {currentNode && (
        <div className="current-node">
          <span className="current-node-dot"></span>
          Langkah aktif: <strong>{currentNode}</strong>
        </div>
      )}

      <LogStream
        logs={logs}
        maxVisible={expanded ? 500 : 6}
        showAll={expanded}
      />

      {logs.length > 0 && (
        <button className="btn-text" onClick={() => setExpanded(!expanded)}>
          {expanded ? '▲ Sembunyikan detail' : `▼ Lihat semua ${logs.length} log`}
        </button>
      )}
    </div>
  );
}

export default ExecutionCard;
