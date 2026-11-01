import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import * as schema from "./schema";

export async function openLocalDatabase() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Embedded local storage is for development only.");
  const dataDir = process.env.GRIPER_LOCAL_DATA_DIR;
  const migrations = process.env.GRIPER_MIGRATIONS_DIR;
  if (!dataDir || !migrations)
    throw new Error(
      "Run pnpm local:setup, then pnpm local from the repository root.",
    );

  const lockPath = `${resolve(dataDir)}.lock`;
  mkdirSync(dirname(lockPath), { recursive: true, mode: 0o700 });
  const lock = JSON.stringify({ pid: process.pid, token: randomUUID() });
  try {
    writeFileSync(lockPath, lock, { flag: "wx", mode: 0o600 });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
    let stale = false;
    try {
      const previous = JSON.parse(readFileSync(lockPath, "utf8"));
      if (!Number.isInteger(previous.pid) || previous.pid <= 0)
        throw new Error("Invalid local database lock");
      try {
        process.kill(previous.pid, 0);
      } catch (probe: any) {
        if (probe.code === "ESRCH") stale = true;
        else throw probe;
      }
    } catch (probe) {
      throw new Error(
        `Cannot verify the local database lock at ${lockPath}. Stop any local server before checking it.`,
        { cause: probe },
      );
    }
    if (!stale)
      throw new Error(
        "This local database is already open. Stop the other local server/setup command first.",
      );
    unlinkSync(lockPath);
    writeFileSync(lockPath, lock, { flag: "wx", mode: 0o600 });
  }
  const release = () => {
    try {
      if (readFileSync(lockPath, "utf8") === lock) unlinkSync(lockPath);
    } catch {
      /* Already released. */
    }
  };
  process.once("exit", release);
  const client = new PGlite(resolve(dataDir));
  const localDb = drizzle(client, { schema });
  const close = async () => {
    try {
      await client.close();
    } finally {
      release();
      process.removeListener("exit", release);
    }
  };
  try {
    await migrate(localDb, { migrationsFolder: resolve(migrations) });
  } catch (error) {
    await close();
    throw error;
  }
  return { db: localDb, close };
}
