import React from 'react';
import Header from './components/Header';
import ExecutionList from './components/ExecutionList';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`;
  const { connected, allExecutions } = useWebSocket(wsUrl);

  const runningCount = allExecutions.filter(e => e.status === 'running').length;

  return (
    <div className="app-layout">
      <Header
        connected={connected}
        runningCount={runningCount}
        totalCount={allExecutions.length}
      />
      <main className="main-content">
        <ExecutionList executions={allExecutions} />
      </main>
    </div>
  );
}

export default App;
