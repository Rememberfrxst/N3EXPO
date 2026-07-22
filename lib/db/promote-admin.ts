import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './src/schema/index.js';
import { eq } from 'drizzle-orm';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log('Promoting user to admin...');

  await db.update(schema.users)
    .set({ role: 'admin' })
    .where(eq(schema.users.email, 'admin@meta.com'));

  console.log('User promoted successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
