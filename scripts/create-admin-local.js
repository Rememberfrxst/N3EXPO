import pg from '../lib/db/node_modules/pg/lib/index.js';
import bcrypt from '../artifacts/api-server/node_modules/bcryptjs/index.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function run() {
  console.log('Creating admin user...');
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('adminpassword123', salt);

  const query = `
    INSERT INTO users (name, email, password_hash, role, is_verified, is_seller)
    VALUES ('Meta Admin', 'admin@meta.com', $1, 'admin', true, false)
    ON CONFLICT (email) DO UPDATE 
    SET role = 'admin', is_verified = true;
  `;

  try {
    await pool.query(query, [passwordHash]);
    console.log('Admin user successfully created/updated! 🚀');
    console.log('Email: admin@meta.com');
    console.log('Password: adminpassword123');
  } catch (e) {
    console.error('Failed to create admin user:', e);
  } finally {
    await pool.end();
  }
}

run();
