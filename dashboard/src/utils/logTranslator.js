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
  node_started:  (ctx) => `⚙️ Menjalankan langkah: ${ctx.nodeName || '...'}`,
  node_success:  (ctx) => `✔️ Langkah selesai: ${ctx.nodeName || '...'}`,
  node_error:    (ctx) => `✖️ Langkah gagal: ${ctx.nodeName || '...'}`,

  // Internal events (disederhanakan)
  execution_init:    (ctx) => ctx.workflowName
                                ? `📋 Eksekusi dimulai untuk workflow "${ctx.workflowName}"`
                                : '📋 Eksekusi dimulai',
  workflow_launched: (ctx) => ctx.workflowName
                                ? `🚀 Menjalankan workflow "${ctx.workflowName}"`
                                : '🚀 Workflow dijalankan',
  hook_executing:    () => '🔗 Menyimpan status eksekusi...',
  db_save:           () => '💾 Menyimpan data ke database...',

  // Fallback
  raw_log:  (ctx) => ctx.message,
  generic:  (ctx) => ctx.message,
};

// Apakah pesan ini penting untuk ditampilkan?
const IMPORTANT_IDS = new Set([
  'workflow_started', 'workflow_completed', 'workflow_error',
  'node_start', 'node_started', 'node_success', 'node_error',
  'execution_init', 'workflow_launched', 'waiting_trigger',
]);

export function translateLog(messageId, context = {}) {
  const fn = TRANSLATIONS[messageId] || TRANSLATIONS.generic;
  return fn(context);
}

export function isImportantLog(messageId) {
  return IMPORTANT_IDS.has(messageId);
}
