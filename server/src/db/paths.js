import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));
export const SEEDS_DIR = fileURLToPath(new URL('../../db/seeds', import.meta.url));
