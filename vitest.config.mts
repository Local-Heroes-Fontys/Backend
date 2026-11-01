import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      DB_HOST: 'localhost',
      DB_NAME: 'local_heroes_test',
      DB_USER: 'test',
      DB_PASSWORD: 'test',
    },
  },
});
