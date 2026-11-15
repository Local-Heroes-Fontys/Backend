import { defineConfig } from 'vitest/config';

// DB_HOST, DB_USER and DB_PASSWORD come from your .env. Start MySQL first: `docker compose up -d`.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/helpers/global-setup.ts'],
    // Test files share one database, so run them one after another to keep them independent.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      DB_NAME: 'local_heroes_test',
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    },
  },
});
