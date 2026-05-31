import React, { useState, useEffect } from 'react';

function Header({ connected, runningCount = 0, totalCount = 0 }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand */}
        <div className="header-brand">
          <div className="header-brand-icon">⚡</div>
          <span className="header-brand-name">AutoMonitor</span>
          <span className="header-brand-tag">n8n</span>
        </div>

        <div className="header-divider" />

        {/* Live stats */}
        <div className="header-stats">
          {runningCount > 0 && (
            <div className="header-stat">
              <div className="header-stat-dot running" />
              <span className="header-stat-value">{runningCount}</span>
              <span>berjalan</span>
            </div>
          )}
          <div className="header-stat">
            <span className="header-stat-value">{totalCount}</span>
            <span>total eksekusi</span>
          </div>
        </div>

        {/* Right side */}
        <div className="header-right">
          <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
            <div className="connection-badge-dot" />
            {connected ? 'Live' : 'Terputus'}
          </div>
          <div className="header-clock">{timeStr}</div>
        </div>
      </div>
    </header>
  );
}

export default Header;
