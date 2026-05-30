import { useState } from 'react';

export function useExecutions(apiUrl) {
  const [executions, setExecutions] = useState([]);
  const [executionDetails, setExecutionDetails] = useState({});
  const [loading, setLoading] = useState(false);

  const loadExecution = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/executions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch execution');
      
      const data = await response.json();
      setExecutionDetails(prev => ({
        ...prev,
        [id]: data
      }));
    } catch (err) {
      console.error('Error loading execution details:', err);
    } finally {
      setLoading(false);
    }
  };

  return { executions, loadExecution, executionDetails, loading };
}
