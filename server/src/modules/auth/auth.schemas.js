import { z } from 'zod';

// bcrypt ignores everything after 72 bytes, so longer passwords would be silently truncated.
const BCRYPT_MAX_BYTES = 72;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Must be a valid email address'));

// Unknown keys (e.g. "role") are stripped, so clients cannot register themselves as admins.
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((value) => Buffer.byteLength(value) <= BCRYPT_MAX_BYTES, 'Password is too long'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
