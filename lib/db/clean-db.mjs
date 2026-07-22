import { Client } from 'pg';

async function clean() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to DB, dropping schema...");
  await client.query('DROP SCHEMA public CASCADE;');
  await client.query('CREATE SCHEMA public;');
  console.log("Database schema reset successfully.");
  await client.end();
}

clean().catch(console.error);
