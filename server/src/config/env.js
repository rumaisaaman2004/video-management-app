import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Tests load .env.test so they can never touch the development database.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: fileURLToPath(new URL(`../../${envFile}`, import.meta.url)), quiet: true });

const DEFAULT_LOG_LEVEL = { development: 'debug', test: 'silent', production: 'info' };

const envSchema = z.object({
  // Required, never defaulted: a production server that forgot to set it would otherwise
  // run in development mode (non-secure cookies, demo seeding allowed).
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).optional(),
  // Number of reverse proxies in front of the app (0 = none); needed for correct client IPs.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  JWT_SECRET: z.string().min(32, 'Must be at least 32 characters'),
  JWT_ACCESS_TOKEN_TTL: z
    .string()
    .regex(/^\d+[smhd]$/, 'Must look like 15m, 1h or 1d')
    .default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // Login/register attempts allowed per IP address in each 15-minute window.
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // Where uploaded and processed media is stored; relative paths are resolved from server/.
  STORAGE_DIR: z.string().min(1).default('uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(500),
  // FFmpeg is CPU-heavy; raise only on machines with spare cores.
  VIDEO_PROCESSING_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  FFMPEG_PATH: z.string().min(1).default('ffmpeg'),
  FFPROBE_PATH: z.string().min(1).default('ffprobe'),
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
