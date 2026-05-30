import React from 'react';
import HistoryRow from './HistoryRow';
import { useExecutions } from '../hooks/useExecutions';

function ExecutionHistory({ executions }) {
  const apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
  const { loadExecution, executionDetails } = useExecutions(apiUrl);

  const handleExpand = (id) => {
    if (!executionDetails[id]) {
      loadExecution(id);
    }
  };

  return (
    <section>
      <div className="section-title">
        ✓ RIWAYAT (20 terakhir)
      </div>
      
      {executions.length === 0 ? (
        <div className="empty-state">
          Belum ada riwayat automation
        </div>
      ) : (
        <div className="history-list">
          {executions.map(exec => (
            <HistoryRow 
              key={exec.id} 
              execution={exec} 
              onExpand={() => handleExpand(exec.id)}
              logs={executionDetails[exec.id]?.logs}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ExecutionHistory;
