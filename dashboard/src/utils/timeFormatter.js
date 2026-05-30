export function formatDuration(ms) {
  if (ms == null) return '--';
  
  if (ms < 1000) {
    return `${ms} ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} detik`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (remainingSeconds === 0) {
    return `${minutes} menit`;
  }
  return `${minutes} menit ${remainingSeconds} detik`;
}

export function formatRelativeTime(unixMs) {
  if (!unixMs) return '';
  
  const now = Date.now();
  const diffMs = now - unixMs;
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return 'baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  
  return `${Math.floor(diffSec / 86400)} hari lalu`;
}

export function formatTime(unixMs) {
  if (!unixMs) return '--:--';
  const date = new Date(unixMs);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatElapsed(startedAtMs) {
  if (!startedAtMs) return '0d';
  
  const now = Date.now();
  const diffSec = Math.floor((now - startedAtMs) / 1000);
  
  if (diffSec < 0) return '0d';
  
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}d`;
  }
  
  return `${seconds}d`;
}
