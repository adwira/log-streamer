import React from 'react';
import ExecutionCard from './ExecutionCard';

function ActiveExecutions({ executions }) {
  return (
    <section>
      <div className="section-title">
        <span className="status-dot connected"></span>
        SEDANG BERJALAN <span className="badge">{executions.length}</span>
      </div>
      
      {executions.length === 0 ? (
        <div className="empty-state">
          Tidak ada automation yang berjalan saat ini
        </div>
      ) : (
        <div className="active-list">
          {executions.map(exec => (
            <ExecutionCard key={exec.id} execution={exec} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ActiveExecutions;
