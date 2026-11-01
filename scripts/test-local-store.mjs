import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(tmpdir(), "griper-local-check-"));
try {
  const build = spawn(
    "pnpm",
    ["--filter", "@workspace/api-server", "run", "build"],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  const buildCode = await new Promise((resolveExit, reject) => {
    build.once("error", reject);
    build.once("exit", (code) => resolveExit(code));
  });
  if (buildCode !== 0) throw new Error("API build failed before local tests.");
  const child = spawn(
    "pnpm",
    ["--filter", "@workspace/api-server", "run", "test"],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        GRIPER_LOCAL_MODE: "1",
        GRIPER_LOCAL_DATA_DIR: join(temporary, "store_test"),
        GRIPER_MIGRATIONS_DIR: join(root, "lib/db/drizzle"),
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
      },
    },
  );
  process.exitCode = await new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
  if (process.exitCode === 0) {
    const persistence = spawn(
      process.execPath,
      ["--test", "artifacts/api-server/test/local-store.test.mjs"],
      { cwd: root, stdio: "inherit", env: process.env },
    );
    process.exitCode = await new Promise((resolveExit, reject) => {
      persistence.once("error", reject);
      persistence.once("exit", (code) => resolveExit(code ?? 1));
    });
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
