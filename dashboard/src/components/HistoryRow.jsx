import React, { useState } from 'react';
import LogStream from './LogStream';
import { formatTime, formatDuration, formatRelativeTime } from '../utils/timeFormatter';

function HistoryRow({ execution, onExpand, logs }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    const nextState = !expanded;
    setExpanded(nextState);
    if (nextState) {
      onExpand();
    }
  };

  const isSuccess = execution.status === 'completed';
  const isError = execution.status === 'error';
  
  let iconClass = 'running';
  let icon = '🔄';
  if (isSuccess) {
    iconClass = 'success';
    icon = '✓';
  } else if (isError) {
    iconClass = 'error';
    icon = '✗';
  }

  const finishedTime = execution.finished_at ? formatTime(parseInt(execution.finished_at)) : '--:--';
  const duration = execution.duration_ms ? formatDuration(execution.duration_ms) : '--';
  const relativeTime = execution.finished_at ? formatRelativeTime(parseInt(execution.finished_at)) : '';

  // Extract error message if status is error and logs exist
  let errorMessage = 'Terjadi kesalahan tidak diketahui';
  if (isError && logs) {
    const errorLog = logs.find(l => l.message_id === 'workflow_error');
    if (errorLog && errorLog.message) {
      errorMessage = errorLog.message;
    }
  }

  return (
    <div className="history-row">
      <div className="history-summary" onClick={toggleExpand}>
        <div className={`history-icon ${iconClass}`}>{icon}</div>
        <div className="history-title">{execution.workflow_name || 'Unknown Workflow'}</div>
        <div className="history-meta">
          <div title={relativeTime}>{finishedTime}</div>
          <div>{duration}</div>
          <button className="history-toggle">
            {expanded ? '[-]' : '[+]'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="history-details">
          {isError && (
            <div className="error-box">
              <span>⚠️</span>
              <div>
                <strong>Error:</strong> {errorMessage}
              </div>
            </div>
          )}
          
          {logs ? (
            <LogStream logs={logs} maxVisible={1000} />
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
