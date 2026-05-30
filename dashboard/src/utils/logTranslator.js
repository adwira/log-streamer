const translations = {
  workflow_started:   () => "Automation mulai berjalan",
  workflow_completed: () => "Automation selesai ✓",
  workflow_error:     (ctx) => `Automation gagal: ${ctx.errorMessage || "Terjadi kesalahan"}`,
  node_executing:     (ctx) => `Menjalankan langkah: ${ctx.nodeName || "..."}`,
  node_completed:     (ctx) => `Langkah ${ctx.nodeName || ""} selesai`,
  waiting_trigger:    () => "Menunggu trigger...",
  raw_log:            (ctx) => ctx.message,
  generic:            (ctx) => ctx.message,
};

export function translateLog(messageId, context = {}) {
  const fn = translations[messageId] || translations.generic;
  return fn(context);
}
