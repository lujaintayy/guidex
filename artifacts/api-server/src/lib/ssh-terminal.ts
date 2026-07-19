/**
 * WebSocket SSH terminal handler.
 *
 * Clients connect to ws[s]://<host>/api/ws/ssh?token=<jwt>&serverId=<id>&orgId=<id>
 * The server:
 *  1. Validates the JWT token
 *  2. Fetches server credentials from the database
 *  3. Opens an SSH PTY session via ssh2
 *  4. Bidirectionally pipes data between WebSocket and SSH channel
 *
 * Protocol (all messages are strings):
 *   Client → Server:  raw terminal input (keystrokes)
 *   Server → Client:  raw terminal output  |  JSON { type:"error", message }
 *   Client → Server:  JSON { type:"resize", cols, rows }
 */
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { Client as SshClient } from "ssh2";
import { parse as parseQs } from "querystring";
import { parse as parseUrl } from "url";
import { verifyToken } from "./auth";
import { db } from "@workspace/db";
import { serversTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export function setupSshTerminal(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const query = parseQs((parseUrl(req.url ?? "").query) ?? "");
    const token    = Array.isArray(query["token"])    ? query["token"][0]    : query["token"];
    const serverIdStr = Array.isArray(query["serverId"]) ? query["serverId"][0] : query["serverId"];
    const orgIdStr    = Array.isArray(query["orgId"])    ? query["orgId"][0]    : query["orgId"];

    if (!token || !serverIdStr || !orgIdStr) {
      ws.send(JSON.stringify({ type: "error", message: "Missing token, serverId or orgId" }));
      ws.close(1008);
      return;
    }

    // Validate JWT
    const payload = verifyToken(token);
    if (!payload) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid or expired token" }));
      ws.close(1008);
      return;
    }

    const serverId = parseInt(serverIdStr, 10);
    const orgId    = parseInt(orgIdStr, 10);

    // Look up server
    db.select().from(serversTable)
      .where(and(eq(serversTable.id, serverId), eq(serversTable.orgId, orgId)))
      .limit(1)
      .then(([server]) => {
        if (!server) {
          ws.send(JSON.stringify({ type: "error", message: "Server not found" }));
          ws.close(1008);
          return;
        }

        const ssh = new SshClient();

        // ── SSH connect options ──────────────────────────────────────────────
        const connectConfig: Parameters<SshClient["connect"]>[0] = {
          host: server.host,
          port: server.sshPort,
          username: server.sshUsername,
          readyTimeout: 15000,
        };

        if (server.sshAuthMethod === "password" && server.sshPassword) {
          connectConfig.password = server.sshPassword;
        } else if (server.sshAuthMethod === "key" && server.sshPassword) {
          // sshPassword reused as privateKey content for key-based auth
          connectConfig.privateKey = server.sshPassword;
        } else {
          // No credentials stored — let client send password in query
          const pw = Array.isArray(query["password"]) ? query["password"][0] : query["password"];
          if (pw) connectConfig.password = pw;
        }

        ssh.on("ready", () => {
          ws.send(JSON.stringify({ type: "connected", host: server.host }));

          ssh.shell({ term: "xterm-256color", cols: 80, rows: 24 }, (err, stream) => {
            if (err) {
              ws.send(JSON.stringify({ type: "error", message: err.message }));
              ws.close();
              ssh.end();
              return;
            }

            // SSH → WebSocket
            stream.on("data", (data: Buffer) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(data.toString("utf8"));
            });
            stream.stderr.on("data", (data: Buffer) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(data.toString("utf8"));
            });
            stream.on("close", () => {
              ws.send(JSON.stringify({ type: "disconnected" }));
              ws.close();
              ssh.end();
            });

            // WebSocket → SSH
            ws.on("message", (raw) => {
              const msg = raw.toString();
              try {
                const parsed = JSON.parse(msg);
                if (parsed.type === "resize") {
                  stream.setWindow(parsed.rows ?? 24, parsed.cols ?? 80, 0, 0);
                }
                return;
              } catch {
                // Not JSON — raw keystroke input
              }
              stream.write(msg);
            });

            ws.on("close", () => { stream.close(); ssh.end(); });
          });
        });

        ssh.on("error", (err) => {
          const msg = err.message.includes("Authentication")
            ? "Authentication failed — check your credentials"
            : `SSH error: ${err.message}`;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "error", message: msg }));
            ws.close();
          }
        });

        ssh.connect(connectConfig);
      })
      .catch((err) => {
        console.error("[ssh-terminal] DB error:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Internal error" }));
          ws.close();
        }
      });
  });
}
