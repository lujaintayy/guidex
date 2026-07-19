import http from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { seedSuperAdmin } from "./lib/seed-admin";
import { setupSshTerminal } from "./lib/ssh-terminal";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Attach WebSocket server to the same HTTP server as Express
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/api/ws/ssh" });
setupSshTerminal(wss);

server.listen(port, async (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  await seedSuperAdmin();
});
