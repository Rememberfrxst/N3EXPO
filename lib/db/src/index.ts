import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const localMode = process.env.GRIPER_LOCAL_MODE === "1";
if (!localMode && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const local = localMode
  ? await (await import("./local")).openLocalDatabase()
  : null;
export const db = local?.db ?? drizzle(pool, { schema });
export async function closeDatabase() {
  await local?.close();
  await pool.end();
}

export * from "./schema";
