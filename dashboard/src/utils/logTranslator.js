// Terjemahan pesan n8n ke Bahasa Indonesia yang mudah dibaca
const TRANSLATIONS = {
  // Lifecycle utama
  workflow_started:   () => '🟢 Automation mulai berjalan',
  workflow_completed: () => '✅ Automation selesai berhasil',
  workflow_error:     (ctx) => `❌ Automation gagal${ctx.errorMessage ? ': ' + ctx.errorMessage : ''}`,
  waiting_trigger:    () => '⏳ Menunggu trigger...',
  execution_removed:  () => '🗑️ Eksekusi dihapus dari memori',

  // Node lifecycle
  node_start:    (ctx) => `▶️ Memulai langkah: ${ctx.nodeName || '...'}`,
  node_started:  (ctx) => `⚙️ Menjalankan: ${ctx.nodeName || '...'}`,
  node_success:  (ctx) => `✔️ Selesai: ${ctx.nodeName || '...'}`,
  node_error:    (ctx) => `✖️ Gagal: ${ctx.nodeName || '...'}`,

  // Internal events (dimunculkan hanya jika showAll=true)
  execution_init:    (ctx) => ctx.workflowName
                                ? `📋 Inisialisasi: "${ctx.workflowName}"`
                                : '📋 Inisialisasi eksekusi',
  workflow_launched: (ctx) => ctx.workflowName
                                ? `🚀 Workflow "${ctx.workflowName}" dijalankan`
                                : '🚀 Workflow dijalankan',
  hook_executing:    () => '🔗 Menyimpan status...',
  db_save:           () => '💾 Menyimpan ke database...',

  // Fallback
  raw_log:  (ctx) => ctx.message,
  generic:  (ctx) => ctx.message,
};

// Hanya event penting ini yang tampil di tampilan ringkas (bukan showAll)
const IMPORTANT_IDS = new Set([
  'workflow_started', 'workflow_completed', 'workflow_error',
  'node_start', 'node_success', 'node_error',
  'waiting_trigger',
]);

// Internal/verbose events — filter dari tampilan ringkas
const INTERNAL_IDS = new Set([
  'execution_init', 'workflow_launched', 'hook_executing', 'db_save',
  'execution_removed', 'node_started',
]);

export function translateLog(messageId, context = {}) {
  const fn = TRANSLATIONS[messageId] || TRANSLATIONS.generic;
  return fn(context);
}

export function isImportantLog(messageId) {
  return IMPORTANT_IDS.has(messageId);
}

export function isInternalLog(messageId) {
  return INTERNAL_IDS.has(messageId);
}

/**
 * Deduplicate logs: hapus entri berurutan yang memiliki message_id sama
 * dalam window 3 detik. Mencegah "Eksekusi dimulai" muncul 3x.
 */
export function deduplicateLogs(logs) {
  const DEDUP_WINDOW_MS = 3000;
  const result = [];

  for (const log of logs) {
    const msgId = log.message_id || log.messageId || 'generic';
    // Skip event generic/raw_log dari dedup karena mungkin berbeda isinya
    if (msgId === 'generic' || msgId === 'raw_log') {
      result.push(log);
      continue;
    }

    const ts = parseInt(log.timestamp || 0);
    // Cek apakah ada log dengan message_id yang sama dalam window terakhir
    const hasDuplicate = result.some(existing => {
      const exMsgId = existing.message_id || existing.messageId || 'generic';
      const exTs = parseInt(existing.timestamp || 0);
      return exMsgId === msgId && Math.abs(ts - exTs) < DEDUP_WINDOW_MS;
    });

    if (!hasDuplicate) {
      result.push(log);
    }
  }

  return result;
}
