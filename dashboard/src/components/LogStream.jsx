import React from 'react';
import { formatTime } from '../utils/timeFormatter';
import { translateLog } from '../utils/logTranslator';

function LogStream({ logs, maxVisible }) {
  if (!logs || logs.length === 0) return null;

  // Render log dalam urutan kronologis, ambil dari bawah jika dipotong
  const visibleLogs = logs.length > maxVisible 
    ? logs.slice(logs.length - maxVisible) 
    : logs;

  return (
    <div className="log-stream">
      {visibleLogs.map((log, idx) => {
        const timeStr = formatTime(parseInt(log.timestamp || Date.now()));
        const translatedMsg = translateLog(log.message_id, {
          nodeName: log.node_name,
          errorMessage: log.message,
          message: log.message
        });
        
        let levelClass = 'log-level-info';
        if (log.level === 'warn') levelClass = 'log-level-warn';
        if (log.level === 'error' || log.level === 'fatal') levelClass = 'log-level-error';
        if (log.level === 'debug' || log.level === 'trace') levelClass = 'log-level-debug';

        return (
          <div key={log.id || idx} className="log-entry">
            <span className="log-time">[{timeStr}]</span>
            <span className="log-icon">▸</span>
            <span className={`log-message ${levelClass}`}>{translatedMsg}</span>
          </div>
        );
      })}
    </div>
  );
}

export default LogStream;
