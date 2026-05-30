const activeWorkflows = {}; // workflowId -> executionId

function parseLog(rawLine) {
  try {
    const data = JSON.parse(rawLine);
    
    // Mapping pino level to string
    let levelStr = 'info';
    if (data.level === 10) levelStr = 'trace';
    else if (data.level === 20) levelStr = 'debug';
    else if (data.level === 30) levelStr = 'info';
    else if (data.level === 40) levelStr = 'warn';
    else if (data.level === 50) levelStr = 'error';
    else if (data.level === 60) levelStr = 'fatal';
    else if (typeof data.level === 'string') levelStr = data.level.toLowerCase();

    // Deteksi messageId
    let messageId = 'generic';
    const msg = data.msg || data.message || '';
    
    if (msg.includes('Workflow execution started') || msg === 'Workflow started') messageId = 'workflow_started';
    else if (msg.includes('Workflow execution finished successfully') || msg === 'Workflow execution finished successfully') messageId = 'workflow_completed';
    else if (msg.includes('Workflow execution failed') || msg === 'Workflow execution failed') messageId = 'workflow_error';
    else if (msg.includes('Executing node') || msg === 'Executing node') messageId = 'node_executing';
    else if (msg.includes('Node executed successfully') || msg === 'Node executed successfully') messageId = 'node_completed';
    else if (msg.includes('Waiting for trigger') || msg === 'Waiting for trigger') messageId = 'waiting_trigger';
    else if (msg.includes('Execution finalized')) messageId = 'workflow_completed'; // Fallback

    let errorMessage = null;
    if (data.error && data.error.message) {
      errorMessage = data.error.message;
    }
    
    const meta = data.metadata || {};
    let timestamp = Date.now();
    if (data.time) timestamp = data.time;
    else if (meta.timestamp) timestamp = new Date(meta.timestamp).getTime();

    let executionId = data.executionId || meta.executionId || null;
    const workflowId = data.workflowId || meta.workflowId || null;
    
    if (executionId && workflowId) {
      activeWorkflows[workflowId] = executionId;
    } else if (!executionId && workflowId && activeWorkflows[workflowId]) {
      executionId = activeWorkflows[workflowId];
    }

    return {
      timestamp: timestamp,
      level: levelStr,
      executionId: executionId,
      workflowId: workflowId,
      workflowName: data.workflowName || meta.workflowName || null,
      nodeName: data.nodeName || meta.nodeName || null,
      message: msg,
      messageId: messageId,
      status: 'running', // default
      errorMessage: errorMessage,
      raw: rawLine
    };
  } catch (err) {
    // Handle baris yang bukan valid JSON
    return {
      timestamp: Date.now(),
      level: 'info',
      executionId: null,
      workflowId: null,
      workflowName: null,
      nodeName: null,
      message: rawLine,
      messageId: 'raw_log',
      status: 'running',
      errorMessage: null,
      raw: rawLine
    };
  }
}

module.exports = { parseLog };
