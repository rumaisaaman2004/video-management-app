import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Tests load .env.test so they can never touch the development database.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: fileURLToPath(new URL(`../../${envFile}`, import.meta.url)), quiet: true });

const DEFAULT_LOG_LEVEL = { development: 'debug', test: 'silent', production: 'info' };

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).optional(),
});

const parsed = envSchema.safeParse(process.env);

// Fail fast at startup instead of crashing later with a confusing error.
if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

const { LOG_LEVEL, ...settings } = parsed.data;

export const env = Object.freeze({
  ...settings,
  LOG_LEVEL: LOG_LEVEL ?? DEFAULT_LOG_LEVEL[settings.NODE_ENV],
});
