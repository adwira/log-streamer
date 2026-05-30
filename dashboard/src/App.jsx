import React from 'react';
import Header from './components/Header';
import ActiveExecutions from './components/ActiveExecutions';
import ExecutionHistory from './components/ExecutionHistory';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`;
  const { connected, activeExecutions, recentExecutions } = useWebSocket(wsUrl);

  return (
    <div className="container">
      <Header connected={connected} />
      
      <ActiveExecutions executions={activeExecutions} />
      
      <ExecutionHistory executions={recentExecutions} />
    </div>
  );
}

export default App;
