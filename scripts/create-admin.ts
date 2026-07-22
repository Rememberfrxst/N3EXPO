import { db } from '../lib/db/src/index';
import { users } from '../lib/db/src/schema/index';
import bcrypt from 'bcryptjs';

async function run() {
  console.log('Creating admin user...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('adminpassword123', salt);

  try {
    await db.insert(users).values({
      name: 'Meta Admin',
      email: 'admin@meta.com',
      passwordHash,
      role: 'admin',
      isVerified: true,
    });
    console.log('Admin user successfully created! 🚀');
    console.log('Email: admin@meta.com');
    console.log('Password: adminpassword123');
  } catch (e: any) {
    if (e.code === '23505') {
      console.log('Admin user already exists.');
    } else {
      console.error('Failed to create admin user:', e);
    }
  }
  process.exit(0);
}

run();
