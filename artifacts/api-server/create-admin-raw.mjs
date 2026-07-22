import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Seeding admin user...');

  const passwordHash = await bcrypt.hash('adminpassword123', 10);
  const now = new Date().toISOString();

  const query = `
    INSERT INTO users (id, name, email, password_hash, role, is_2fa_enabled, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Admin User', 'admin@meta.com', $1, 'admin', false, $2, $2)
  `;

  await pool.query(query, [passwordHash, now]);

  console.log('Admin user created successfully! Email: admin@meta.com | Password: adminpassword123');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
