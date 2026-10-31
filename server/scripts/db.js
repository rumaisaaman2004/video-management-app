import { env } from '../src/config/env.js';
import { migrate, seed, dropSchema } from '../src/db/migrator.js';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../src/db/paths.js';
import { pool } from '../src/db/pool.js';

function logList(label, names) {
  console.log(names.length > 0 ? `${label}:\n  ${names.join('\n  ')}` : `${label}: none`);
}

const commands = {
  async migrate() {
    logList('Applied migrations', await migrate(pool, MIGRATIONS_DIR));
  },

  async seed() {
    // Seeds include demo accounts with a published password.
    if (env.NODE_ENV === 'production') {
      throw new Error('Refusing to seed demo data in production');
    }
    logList('Ran seeds', await seed(pool, SEEDS_DIR));
  },

  async reset() {
    if (env.NODE_ENV === 'production') {
      throw new Error('Refusing to reset the database in production');
    }
    await dropSchema(pool);
    console.log('Dropped all tables');
    await commands.migrate();
    await commands.seed();
  },
};

const commandName = process.argv[2];
const command = commands[commandName];

if (!command) {
  console.error(`Usage: node scripts/db.js <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}

try {
  await command();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
