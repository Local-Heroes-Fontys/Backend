import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const server = app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}/api`);
});

function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
