import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isIP } from "node:net";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
if (!["setup", "start", "api", "app"].includes(command))
  throw new Error(
    "Use pnpm local:setup, pnpm local, pnpm local:api or pnpm local:app.",
  );
if (Number(process.versions.node.split(".")[0]) < 24)
  throw new Error("Use Node.js 24 or newer.");
if (process.platform !== "linux" || process.arch !== "x64")
  throw new Error(
    "This repository currently supports Linux x86_64 dependencies. Use a Linux x86_64 environment.",
  );

const dataRoot = process.env.GRIPER_LOCAL_HOME
  ? resolve(process.env.GRIPER_LOCAL_HOME)
  : join(root, ".local/griper");
const secretsFile = join(dataRoot, "signing-secrets.json");
mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
if (!existsSync(secretsFile)) {
  if (command !== "setup")
    throw new Error(
      "First run pnpm local:setup once to create your owner account and local data.",
    );
  writeFileSync(
    secretsFile,
    JSON.stringify({
      JWT_SECRET: randomBytes(32).toString("hex"),
      REFRESH_SECRET: randomBytes(32).toString("hex"),
    }),
    { mode: 0o600, flag: "wx" },
  );
}
const secrets = JSON.parse(readFileSync(secretsFile, "utf8"));
if (
  ![secrets.JWT_SECRET, secrets.REFRESH_SECRET].every(
    (value) => typeof value === "string" && value.length >= 32,
  )
)
  throw new Error(
    "Invalid local signing-secrets.json. Restore the original file from your local backup.",
  );

const candidates = Object.entries(networkInterfaces())
  .filter(
    ([name]) => !/^(lo|docker|br-|veth|virbr|tun|tap|tailscale|wg)/i.test(name),
  )
  .flatMap(([, addresses]) =>
    (addresses || [])
      .filter((a) => a.family === "IPv4" && !a.internal)
      .map((a) => a.address),
  );
const lanIp = process.env.GRIPER_LAN_IP || candidates[0] || "127.0.0.1";
if (isIP(lanIp) !== 4)
  throw new Error("GRIPER_LAN_IP must be your computer's IPv4 address.");
const [apiPort, adminPort, appPort] = [
  "GRIPER_API_PORT",
  "GRIPER_ADMIN_PORT",
  "GRIPER_APP_PORT",
].map((key, i) => {
  const value = process.env[key] || ["3000", "5173", "8081"][i];
  if (!/^\d+$/.test(value) || Number(value) < 1024 || Number(value) > 65535)
    throw new Error(`${key} must be a port between 1024 and 65535.`);
  return value;
});
const env = {
  ...process.env,
  ...secrets,
  NODE_ENV: "development",
  GRIPER_LOCAL_MODE: "1",
  GRIPER_LOCAL_DATA_DIR: join(dataRoot, "database"),
  GRIPER_MIGRATIONS_DIR: join(root, "lib/db/drizzle"),
  PORT: apiPort,
  ADMIN_EMAIL: "rememberfrxst@gmail.com",
  ALLOWED_ORIGINS: `http://localhost:${adminPort},http://127.0.0.1:${adminPort},http://localhost:${appPort},http://127.0.0.1:${appPort},http://${lanIp}:${appPort}`,
  VITE_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
  EXPO_PUBLIC_API_URL: `http://${lanIp}:${apiPort}/api`,
  EXPO_PUBLIC_LOCAL_MODE: "1",
  REACT_NATIVE_PACKAGER_HOSTNAME: lanIp,
  EXPO_NO_TELEMETRY: "1",
  EXPO_NO_DOTENV: "1",
};
for (const key of Object.keys(env))
  if (
    /^(AWS_|RAZORPAY_|PUSHER_)/.test(key) ||
    key === "DATABASE_URL" ||
    key.startsWith("REPLIT_") ||
    key.startsWith("EXPO_PACKAGER_PROXY")
  )
    delete env[key];
delete env.ADMIN_PASSWORD;

async function run(executable, args, options = {}) {
  const child = spawn(executable, args, {
    cwd: root,
    env,
    stdio: ["ignore", "inherit", "inherit"],
    ...options,
  });
  return await new Promise((resolveRun, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolveRun()
        : reject(
            new Error(
              `${executable} ${args.join(" ")} stopped (${signal || code}).`,
            ),
          ),
    );
  });
}

async function passwordPrompt() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY)
    throw new Error(
      "Run setup in an interactive terminal, or supply ADMIN_PASSWORD privately through the environment.",
    );
  process.stdout.write(
    "Choose your local owner password (12+ characters, hidden): ",
  );
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let password = "";
  return await new Promise((resolvePassword, reject) => {
    const finish = (error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolvePassword(password);
    };
    const onData = (buffer) => {
      for (const char of buffer.toString("utf8")) {
        if (char === "\u0003" || char === "\u0004")
          return finish(new Error("Setup cancelled."));
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u007f" || char === "\b")
          password = [...password].slice(0, -1).join("");
        else if (char >= " ") password += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

try {
  console.log(`Local testing data: ${dataRoot}`);
  if (command === "setup") {
    const password = await passwordPrompt();
    if (password.length < 12)
      throw new Error("Choose a password of at least 12 characters.");
    await run("pnpm", ["--filter", "@workspace/api-server", "run", "build"]);
    await run(process.execPath, ["artifacts/api-server/dist/local-setup.mjs"], {
      env: { ...env, ADMIN_PASSWORD: password },
    });
    console.log(
      "Setup complete. Run pnpm local. Re-running setup updates the owner password and keeps your catalog/orders.",
    );
  } else {
    if (command !== "app")
      await run("pnpm", ["--filter", "@workspace/api-server", "run", "build"]);
    console.log(
      `Admin: http://localhost:${adminPort}\nAPI: http://${lanIp}:${apiPort}/api\nPhone check: http://${lanIp}:${apiPort}/api/healthz\nOrders are local test records. Stop all services with Ctrl+C.`,
    );
    const jobs = [];
    if (command !== "app")
      jobs.push([process.execPath, ["artifacts/api-server/dist/index.mjs"]]);
    if (command === "start")
      jobs.push([
        "pnpm",
        [
          "--filter",
          "@workspace/admin-web",
          "run",
          "dev",
          "--host",
          "127.0.0.1",
          "--port",
          adminPort,
          "--strictPort",
        ],
      ]);
    if (command !== "api")
      jobs.push([
        process.execPath,
        [
          createRequire(join(root, "artifacts/mobile/package.json")).resolve(
            "expo/bin/cli",
          ),
          "start",
          "--lan",
          "--port",
          appPort,
        ],
        true,
      ]);
    const children = [];
    let stopping = false;
    let timeout;
    const stop = (code) => {
      if (stopping) return;
      stopping = true;
      process.exitCode = code;
      for (const { child, interactive } of children)
        try {
          if (interactive) child.kill("SIGTERM");
          else process.kill(-child.pid, "SIGTERM");
        } catch {
          /* Already exited. */
        }
      timeout = setTimeout(() => {
        for (const { child, interactive } of children)
          try {
            if (interactive) child.kill("SIGKILL");
            else process.kill(-child.pid, "SIGKILL");
          } catch {
            /* Already exited. */
          }
      }, 12000);
      timeout.unref();
    };
    process.once("SIGINT", () => stop(0));
    process.once("SIGTERM", () => stop(0));
    await Promise.all(
      jobs.map(
        ([executable, args, interactive = false]) =>
          new Promise((resolveChild) => {
            const child = spawn(executable, args, {
              cwd: interactive ? join(root, "artifacts/mobile") : root,
              env,
              stdio: [interactive ? "inherit" : "ignore", "inherit", "inherit"],
              detached: !interactive,
            });
            children.push({ child, interactive });
            child.once("error", (error) => {
              console.error(error.message);
              stop(1);
              resolveChild();
            });
            child.once("exit", (code, signal) => {
              if (!stopping) {
                console.error(`${executable} stopped (${signal || code}).`);
                stop(code ?? 1);
              }
              resolveChild();
            });
          }),
      ),
    );
    clearTimeout(timeout);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
