import { config } from 'dotenv';
import { z } from 'zod';

config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.url(),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

// Stop at startup with a clear message instead of failing later on the first request.
if (!parsed.success) {
  console.error('Invalid environment variables. Check your .env file against .env.example:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
