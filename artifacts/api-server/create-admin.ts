import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './src/schema/index.js';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log('Seeding admin user...');

  const passwordHash = await bcrypt.hash('adminpassword123', 10);

  await db.insert(schema.users).values({
    name: 'Admin User',
    email: 'admin@meta.com',
    passwordHash: passwordHash,
    role: 'admin',
    is2faEnabled: false
  });

  console.log('Admin user created successfully! Email: admin@meta.com | Password: adminpassword123');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
