import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

// Prisma 7 connects through a "driver adapter". The MariaDB driver is the one Prisma uses for MySQL.
const adapter = new PrismaMariaDb({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  connectionLimit: 10,
  // MySQL 8 needs this for password login without TLS, which is what the local Docker setup uses.
  allowPublicKeyRetrieval: env.NODE_ENV !== 'production',
});

// One shared client for the whole app. Only repositories (and seeds/tests) should import it.
export const prisma = new PrismaClient({ adapter });
