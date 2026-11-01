import os from "os";
import app from "./app";
import { logger } from "./lib/logger";
import { closeDatabase } from "@workspace/db";

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const localIp = getLocalIp();

const server = app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info(
    {
      port,
      localUrl: `http://${localIp}:${port}/api`,
      localhostUrl: `http://localhost:${port}/api`,
      mobileHint: `Set EXPO_PUBLIC_API_URL=http://${localIp}:${port}/api in artifacts/mobile/.env`,
    },
    `🚀 Server listening at http://${localIp}:${port}/api (LAN) and http://localhost:${port}/api`,
  );
});

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      try {
        await closeDatabase();
        process.exit(0);
      } catch (error) {
        logger.error(error, "Database shutdown failed");
        process.exit(1);
      }
    });
    server.closeIdleConnections();
  });
}
