import React, { useState, useEffect, useCallback } from 'react';
import LogStream from './LogStream';
import { formatTime, formatDuration, formatElapsed } from '../utils/timeFormatter';
import { useExecutions } from '../hooks/useExecutions';

const STATUS_CONFIG = {
  running:   { icon: '↻', cls: 'running',   label: 'Berjalan' },
  completed: { icon: '✓', cls: 'completed', label: 'Selesai' },
  error:     { icon: '✗', cls: 'error',     label: 'Gagal' },
};

/* --------------------------------------------------------
   Modal Fullscreen Log Viewer
   -------------------------------------------------------- */
function LogModal({ execution, logs, onClose }) {
  const status = STATUS_CONFIG[execution.status] || STATUS_CONFIG.running;
  const workflowName = execution.workflow_name || execution.workflowName || 'Unknown Workflow';
  const duration = execution.duration_ms ? formatDuration(execution.duration_ms) : null;
  const startedTime = execution.started_at ? formatTime(parseInt(execution.started_at)) : '--:--';

  // Extract error message
  let errorMessage = null;
  if (execution.status === 'error' && logs) {
    const errLog = logs.find(l =>
      (l.message_id || l.messageId) === 'workflow_error' || l.level === 'error'
    );
    if (errLog) errorMessage = errLog.message;
  }

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className={`exec-status-icon ${status.cls}`}>
            {execution.status === 'running' ? <span className="spin">{status.icon}</span> : status.icon}
          </div>
          <div className="modal-header-info">
            <div className="modal-workflow-name">
              {workflowName}
              <span className={`status-badge ${status.cls}`}>{status.label}</span>
            </div>
            <div className="modal-meta">
              <span className="modal-meta-item">🕐 Mulai {startedTime}</span>
              {duration && <span className="modal-meta-item">⏱ {duration}</span>}
              {logs && <span className="modal-meta-item">📄 {logs.length} entri log</span>}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Tutup (ESC)">✕</button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="modal-error-banner">
            <span>⚠️</span>
            <div><strong>Error:</strong> {errorMessage}</div>
          </div>
        )}

        {/* Log toolbar */}
        <div className="modal-log-toolbar">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Log dari awal sampai akhir — tekan ESC atau klik area luar untuk tutup
          </span>
        </div>

        {/* Log body */}
        <div className="modal-body">
          <div className="modal-log-container">
            {logs ? (
              <LogStream logs={logs} showAll={true} compact={false} maxVisible={500} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Memuat log...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------
   Single Execution Row
   -------------------------------------------------------- */
function ExecutionRow({ execution, logs, onExpand }) {
  const [expanded, setExpanded]    = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [elapsed, setElapsed]      = useState('');

  const status = STATUS_CONFIG[execution.status] || STATUS_CONFIG.running;
  const workflowName = execution.workflow_name || execution.workflowName || 'Unknown Workflow';
  const isRunning = execution.status === 'running';

  // Elapsed timer for running executions
  useEffect(() => {
    if (!isRunning || !execution.started_at) return;
    const update = () => setElapsed(formatElapsed(parseInt(execution.started_at)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [isRunning, execution.started_at]);

  const startedTime = execution.started_at ? formatTime(parseInt(execution.started_at)) : '--:--';
  const duration    = execution.duration_ms ? formatDuration(execution.duration_ms) : (elapsed || null);

  // Current active node (for running)
  const currentNode = isRunning && execution.currentNode ? execution.currentNode : null;

  // Node step count
  const sourceLogs = logs || execution.logs || [];
  const stepCount = sourceLogs.filter(l =>
    (l.message_id || l.messageId) === 'node_success'
  ).length;

  // Error message
  let errorMessage = null;
  if (execution.status === 'error' && sourceLogs.length > 0) {
    const errLog = sourceLogs.find(l =>
      (l.message_id || l.messageId) === 'workflow_error' || l.level === 'error'
    );
    if (errLog) errorMessage = errLog.message;
  }

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && onExpand) onExpand();
  };

  const handleFullscreen = (e) => {
    e.stopPropagation();
    if (!logs && onExpand) onExpand();
    setFullscreen(true);
  };

  return (
    <>
      <div className={`exec-row status-${status.cls}`}>
        {/* Summary row */}
        <div className="exec-summary" onClick={handleToggle}>
          {/* Status icon */}
          <div className={`exec-status-icon ${status.cls}`}>
            {isRunning ? <span className="spin">{status.icon}</span> : status.icon}
          </div>

          {/* Info */}
          <div className="exec-info">
            <div className="exec-workflow-name">
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {workflowName}
              </span>
              {currentNode && (
                <span className="exec-node-chip" title={currentNode}>{currentNode}</span>
              )}
            </div>
            <div className="exec-meta-row">
              <span className="exec-time">{startedTime}</span>
              {stepCount > 0 && (
                <span className="exec-step-count">· {stepCount} langkah</span>
              )}
              {isRunning && (
                <span className={`status-badge ${status.cls}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                  Live
                </span>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="exec-right">
            {duration && (
              <span className={`exec-duration ${status.cls}`}>{duration}</span>
            )}
            <button
              className="exec-expand-btn"
              onClick={handleFullscreen}
              title="Buka fullscreen"
            >
              ⛶
            </button>
            <button
              className="exec-expand-btn"
              onClick={(e) => { e.stopPropagation(); handleToggle(); }}
              title={expanded ? 'Sembunyikan' : 'Tampilkan log'}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Inline expanded logs */}
        {expanded && (
          <div className="exec-details">
            {errorMessage && (
              <div className="modal-error-banner" style={{ borderRadius: '6px', marginBottom: '10px', borderTop: 'none', border: '1px solid var(--red-border)' }}>
                <span>⚠️</span>
                <div><strong>Error:</strong> {errorMessage}</div>
              </div>
            )}
            <div className="exec-details-toolbar">
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {sourceLogs.length} entri log (lama → baru)
              </span>
              <button className="btn-fullscreen" onClick={handleFullscreen}>
                ⛶ Layar penuh
              </button>
            </div>
            <LogStream
              logs={sourceLogs}
              showAll={false}
              compact={true}
              maxVisible={20}
            />
            {sourceLogs.length > 5 && (
              <button className="btn-text" onClick={handleFullscreen}>
                Lihat semua {sourceLogs.length} log →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <LogModal
          execution={execution}
          logs={sourceLogs}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}

/* --------------------------------------------------------
   Unified Execution List
   -------------------------------------------------------- */
function ExecutionList({ executions }) {
  const [filter, setFilter] = useState('all'); // all | running | completed | error

  const apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
  const { loadExecution, executionDetails } = useExecutions(apiUrl);

  const handleExpand = useCallback((id) => {
    if (!executionDetails[id]) {
      loadExecution(id);
    }
  }, [executionDetails, loadExecution]);

  const filtered = filter === 'all'
    ? executions
    : executions.filter(e => e.status === filter);

  const runningCount   = executions.filter(e => e.status === 'running').length;
  const completedCount = executions.filter(e => e.status === 'completed').length;
  const errorCount     = executions.filter(e => e.status === 'error').length;

  return (
    <section>
      {/* Section header + filter bar */}
      <div className="page-header">
        <div>
          <div className="page-title">Execution Log</div>
          <div className="page-subtitle">Semua eksekusi — terbaru di atas</div>
        </div>
        <div className="section-count">{executions.length}</div>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Semua ({executions.length})
        </button>
        {runningCount > 0 && (
          <button
            className={`filter-btn ${filter === 'running' ? 'active' : ''}`}
            onClick={() => setFilter('running')}
          >
            🔵 Berjalan ({runningCount})
          </button>
        )}
        {completedCount > 0 && (
          <button
            className={`filter-btn green ${filter === 'completed' ? 'active green' : ''}`}
            onClick={() => setFilter('completed')}
          >
            ✅ Selesai ({completedCount})
          </button>
        )}
        {errorCount > 0 && (
          <button
            className={`filter-btn red ${filter === 'error' ? 'active red' : ''}`}
            onClick={() => setFilter('error')}
          >
            ❌ Error ({errorCount})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">Belum ada eksekusi</div>
          <div className="empty-state-sub">Log akan muncul saat workflow n8n dijalankan</div>
        </div>
      ) : (
        <div className="execution-list">
          {filtered.map(exec => {
            // Prefer fetched logs for history, in-memory logs for running
            const logsFromHook = executionDetails[exec.id]?.logs;
            const logsInMemory = exec.logs && exec.logs.length > 0 ? exec.logs : null;
            const resolvedLogs = logsFromHook || logsInMemory || null;

            return (
              <ExecutionRow
                key={exec.id}
                execution={exec}
                logs={resolvedLogs}
                onExpand={() => handleExpand(exec.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ExecutionList;
