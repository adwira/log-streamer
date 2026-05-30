import React from 'react';
import { formatTime } from '../utils/timeFormatter';
import { translateLog, isImportantLog } from '../utils/logTranslator';

const LEVEL_CLASS = {
  error: 'log-level-error',
  fatal: 'log-level-error',
  warn:  'log-level-warn',
  info:  'log-level-info',
  debug: 'log-level-debug',
  trace: 'log-level-debug',
};

function LogStream({ logs, maxVisible, showAll = false }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="log-stream log-empty">
        <span style={{ color: 'var(--text-muted)' }}>Tidak ada log untuk ditampilkan.</span>
      </div>
    );
  }

  // Filter: jika tidak showAll, hanya tampilkan log yang penting
  const filtered = showAll
    ? logs
    : logs.filter(l => isImportantLog(l.message_id || l.messageId) || l.level === 'error' || l.level === 'warn');

  const displayLogs = filtered.length > maxVisible
    ? filtered.slice(filtered.length - maxVisible)
    : filtered;

  return (
    <div className="log-stream">
      {displayLogs.map((log, idx) => {
        const timeStr = formatTime(parseInt(log.timestamp || Date.now()));
        const msgId = log.message_id || log.messageId || 'generic';
        const translatedMsg = translateLog(msgId, {
          nodeName:     log.node_name || log.nodeName,
          errorMessage: log.message,
          message:      log.message,
          workflowName: log.workflow_name || log.workflowName,
        });

        const levelClass = LEVEL_CLASS[log.level] || 'log-level-info';
        const isImportant = isImportantLog(msgId);

        return (
          <div
            key={log.id || idx}
            className={`log-entry ${isImportant ? 'log-entry--important' : ''}`}
          >
            <span className="log-time">[{timeStr}]</span>
            <span className={`log-message ${levelClass}`}>{translatedMsg}</span>
          </div>
        );
      })}
    </div>
  );
}

export default LogStream;
