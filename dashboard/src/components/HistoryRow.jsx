import React, { useState } from 'react';
import LogStream from './LogStream';
import { formatTime, formatDuration, formatRelativeTime } from '../utils/timeFormatter';

function HistoryRow({ execution, onExpand, logs }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) onExpand();
  };

  const isSuccess = execution.status === 'completed';
  const isError   = execution.status === 'error';
  const isRunning = execution.status === 'running';

  const iconClass = isSuccess ? 'success' : isError ? 'error' : 'running';
  const icon      = isSuccess ? '✓' : isError ? '✗' : '↺';

  const finishedTime = execution.finished_at ? formatTime(parseInt(execution.finished_at)) : '--:--';
  const duration     = execution.duration_ms  ? formatDuration(execution.duration_ms) : '--';
  const relTime      = execution.finished_at  ? formatRelativeTime(parseInt(execution.finished_at)) : '';

  const workflowName = execution.workflow_name || execution.workflowName || 'Unknown Workflow';

  // Extract error message from logs
  let errorMessage = null;
  if (isError && logs) {
    const errLog = logs.find(l => (l.message_id || l.messageId) === 'workflow_error' || l.level === 'error');
    if (errLog) errorMessage = errLog.message;
  }

  // Summary: count node steps
  const nodeCount = logs
    ? logs.filter(l => (l.message_id || l.messageId) === 'node_success').length
    : null;

  return (
    <div className="history-row">
      <div className="history-summary" onClick={toggleExpand}>
        <div className={`history-icon ${iconClass}`}>{icon}</div>
        <div className="history-title">
          <span className="history-wf-name">{workflowName}</span>
          {nodeCount !== null && nodeCount > 0 && (
            <span className="history-node-count">{nodeCount} langkah</span>
          )}
        </div>
        <div className="history-meta">
          <div title={relTime}>{finishedTime}</div>
          <div className={`duration-badge ${isError ? 'duration-error' : ''}`}>{duration}</div>
          <button className="history-toggle">{expanded ? '[-]' : '[+]'}</button>
        </div>
      </div>

      {expanded && (
        <div className="history-details">
          {isError && errorMessage && (
            <div className="error-box">
              <span>⚠️</span>
              <div><strong>Error:</strong> {errorMessage}</div>
            </div>
          )}
          {logs ? (
            <LogStream logs={logs} maxVisible={500} showAll={true} />
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              Memuat log...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryRow;
