import React from 'react';
import { formatTime } from '../utils/timeFormatter';
import { translateLog, isImportantLog, isInternalLog, deduplicateLogs } from '../utils/logTranslator';

const LEVEL_CLASS = {
  error: 'log-level-error',
  fatal: 'log-level-error',
  warn:  'log-level-warn',
  info:  'log-level-info',
  debug: 'log-level-debug',
  trace: 'log-level-debug',
};

/**
 * LogStream — tampilkan logs terbaru di paling atas.
 *
 * Props:
 *  - logs: array log entries
 *  - showAll: jika true, tampilkan semua termasuk internal events
 *  - compact: styling compact (dalam card)
 *  - maxVisible: batas jumlah log yang ditampilkan
 */
function LogStream({ logs, showAll = false, compact = true, maxVisible = 100 }) {
  if (!logs || logs.length === 0) {
    return (
      <div className={`log-stream ${compact ? 'compact' : ''} log-empty`}>
        Tidak ada log untuk ditampilkan.
      </div>
    );
  }

  // 1. Deduplication — hapus entri dengan message_id identik dalam window waktu dekat
  const deduped = deduplicateLogs(logs);

  // 2. Filter berdasarkan mode
  const filtered = showAll
    ? deduped
    : deduped.filter(l => {
        const msgId = l.message_id || l.messageId || 'generic';
        if (isInternalLog(msgId)) return false; // sembunyikan internal events
        return isImportantLog(msgId) || l.level === 'error' || l.level === 'warn';
      });

  // 3. Tampilkan ascending (lama → baru), seperti terminal
  // Ambil maxVisible entri terbaru dari ujung array
  const displayLogs = filtered.length > maxVisible
    ? filtered.slice(filtered.length - maxVisible)
    : filtered;

  return (
    <div className={`log-stream ${compact ? 'compact' : ''}`}>
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
