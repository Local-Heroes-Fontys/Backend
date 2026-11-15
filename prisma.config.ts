import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The Prisma CLI (migrate, seed, studio) reads its settings from here. We build the URL from the
// same DB_* variables that docker-compose.yml uses, so the password lives in .env only once.
const { DB_USER, DB_PASSWORD = '', DB_HOST, DB_PORT = '3306', DB_NAME } = process.env;

export default defineConfig({
  schema: 'database/schema.prisma',
  migrations: {
    path: 'database/migrations',
    seed: 'tsx database/seed.ts',
  },
  datasource: {
    url: `mysql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  },
});
