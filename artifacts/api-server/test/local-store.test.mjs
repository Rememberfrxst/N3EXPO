import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const apiRoot = join(root, "artifacts/api-server");
const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

test(
  "local setup, authentication, persistence, locking and production guard",
  { timeout: 90000 },
  async () => {
    const temporary = await mkdtemp(join(tmpdir(), "griper-persistence-"));
    const socket = createServer();
    await new Promise((resolveListen) =>
      socket.listen(0, "127.0.0.1", resolveListen),
    );
    const port = socket.address().port;
    await new Promise((resolveClose) => socket.close(resolveClose));
    const password = randomBytes(24).toString("hex");
    const env = {
      ...process.env,
      NODE_ENV: "test",
      GRIPER_LOCAL_MODE: "1",
      GRIPER_LOCAL_DATA_DIR: join(temporary, "store_test"),
      GRIPER_MIGRATIONS_DIR: join(root, "lib/db/drizzle"),
      JWT_SECRET: randomBytes(32).toString("hex"),
      REFRESH_SECRET: randomBytes(32).toString("hex"),
      ADMIN_PASSWORD: password,
      ADMIN_EMAIL: "rememberfrxst@gmail.com",
      LOG_LEVEL: "silent",
      PORT: String(port),
    };
    delete env.DATABASE_URL;
    let active;
    function child(entry, extraEnv = {}) {
      const processChild = spawn(
        process.execPath,
        [join(apiRoot, "dist", entry)],
        {
          cwd: root,
          env: { ...env, ...extraEnv },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let log = "";
      processChild.stdout.on("data", (data) => {
        log += data;
      });
      processChild.stderr.on("data", (data) => {
        log += data;
      });
      const done = new Promise((resolveDone, reject) => {
        processChild.once("error", reject);
        processChild.once("exit", (code) => resolveDone({ code, log }));
      });
      return { process: processChild, done };
    }
    async function request(path, method = "GET", body, token) {
      const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.ok(response.ok, `${method} ${path}: ${response.status}`);
      return await response.json();
    }
    async function start() {
      active = child("index.mjs");
      for (let attempt = 0; attempt < 100; attempt++) {
        if (active.process.exitCode !== null)
          throw new Error((await active.done).log);
        try {
          await request("/healthz");
          return;
        } catch {
          await wait(150);
        }
      }
      throw new Error("Local API did not become ready.");
    }
    async function stop() {
      active.process.kill("SIGTERM");
      const stopped = await active.done;
      active = undefined;
      assert.equal(stopped.code, 0, stopped.log);
    }
    try {
      const setup = await child("local-setup.mjs").done;
      assert.equal(setup.code, 0, setup.log);
      await start();
      let token = (
        await request("/auth/admin-login", "POST", {
          email: env.ADMIN_EMAIL,
          password,
        })
      ).accessToken;
      let catalog = await request("/products");
      assert.equal(catalog.data.length, 8);
      const product = catalog.data[0];
      await request(
        `/admin/products/${product.id}`,
        "PATCH",
        { name: "Local edited product", price: 1234 },
        token,
      );
      await request(
        `/admin/products/${catalog.data[1].id}`,
        "DELETE",
        undefined,
        token,
      );
      const locked = await child("local-setup.mjs").done;
      assert.notEqual(locked.code, 0);
      assert.match(locked.log, /already open/);
      const guarded = await child("index.mjs", { NODE_ENV: "production" }).done;
      assert.notEqual(guarded.code, 0);
      assert.match(guarded.log, /development only/);
      await stop();
      const repeat = await child("local-setup.mjs").done;
      assert.equal(repeat.code, 0, repeat.log);
      await start();
      token = (
        await request("/auth/admin-login", "POST", {
          email: env.ADMIN_EMAIL,
          password,
        })
      ).accessToken;
      catalog = await request("/products");
      assert.equal(
        catalog.data.length,
        7,
        "Setup must not resurrect archived sample products",
      );
      const persisted = await request(`/products/${product.id}`);
      assert.equal(persisted.name, "Local edited product");
      assert.equal(Number(persisted.price), 1234);
      const offers = await request("/storefront/offers");
      assert.ok(offers.some((offer) => offer.code === "LOCAL10"));
      await stop();
    } finally {
      if (active) {
        active.process.kill("SIGTERM");
        await active.done;
      }
      await rm(temporary, { recursive: true, force: true });
    }
  },
);
