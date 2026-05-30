const db = require('./db');
const { startWebSocketServer } = require('./websocket');
const { startApiServer } = require('./api');
const { startDockerLogsListener } = require('./docker-logs');

const PORT = process.env.PORT || 3001;
const LOG_RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || 7;

async function bootstrap() {
  console.log('Starting log-collector...');
  try {
    // 1. Panggil db.migrate() - tunggu selesai sebelum lanjut
    await db.migrate();
    console.log('Database migration completed.');

    // 2. Inisialisasi WebSocket server
    // 3. Inisialisasi Express API
    // Keduanya bisa jalan di satu server http yang sama, API handle itu
    const server = startApiServer(PORT);
    startWebSocketServer(server);

    // 4. Mulai docker-logs listener
    startDockerLogsListener();

    // 5. Jadwalkan cleanup log lama setiap 24 jam
    setInterval(() => {
      console.log(`Running daily cleanup for logs older than ${LOG_RETENTION_DAYS} days...`);
      db.cleanupOldLogs(LOG_RETENTION_DAYS).catch(err => {
        console.error('Failed to cleanup old logs:', err);
      });
    }, 24 * 60 * 60 * 1000);
    
    // Initial cleanup at startup
    db.cleanupOldLogs(LOG_RETENTION_DAYS).catch(err => {
      console.error('Failed to cleanup old logs at startup:', err);
    });

  } catch (err) {
    console.error('Failed to start log-collector:', err);
    process.exit(1);
  }
}

bootstrap();
