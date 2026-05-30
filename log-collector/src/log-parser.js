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

    // Deteksi messageId
    let messageId = 'generic';
    const msg = data.msg || '';
    
    if (msg === 'Workflow started') messageId = 'workflow_started';
    else if (msg === 'Workflow execution finished successfully') messageId = 'workflow_completed';
    else if (msg === 'Workflow execution failed') messageId = 'workflow_error';
    else if (msg === 'Executing node') messageId = 'node_executing';
    else if (msg === 'Node executed successfully') messageId = 'node_completed';
    else if (msg === 'Waiting for trigger') messageId = 'waiting_trigger';

    let errorMessage = null;
    if (data.error && data.error.message) {
      errorMessage = data.error.message;
    }

    return {
      timestamp: data.time || Date.now(),
      level: levelStr,
      executionId: data.executionId || null,
      workflowId: data.workflowId || null,
      workflowName: data.workflowName || null,
      nodeName: data.nodeName || null,
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
