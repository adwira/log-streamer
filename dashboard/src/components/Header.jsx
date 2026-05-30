import React, { useState, useEffect } from 'react';

function Header({ connected }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="header">
      <div className="header-title">
        <span>🤖</span> Automation Dashboard
      </div>
      <div className="header-status">
        <div className="status-indicator">
          <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
          <span>{connected ? 'Terhubung' : 'Terputus'}</span>
        </div>
        <div>{timeString}</div>
      </div>
    </header>
  );
}

export default Header;
