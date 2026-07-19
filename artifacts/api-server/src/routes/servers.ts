import { Router } from "express";
import net from "net";
import { db } from "@workspace/db";
import { serversTable, serverGroupsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router = Router();
router.use(authMiddleware);

router.get("/organizations/:orgId/servers", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  let servers = await db.select({
    id: serversTable.id,
    name: serversTable.name,
    clientName: serversTable.clientName,
    host: serversTable.host,
    sshPort: serversTable.sshPort,
    sshUsername: serversTable.sshUsername,
    sshAuthMethod: serversTable.sshAuthMethod,
    os: serversTable.os,
    osVersion: serversTable.osVersion,
    status: serversTable.status,
    groupId: serversTable.groupId,
    tags: serversTable.tags,
    description: serversTable.description,
    cpuUsage: serversTable.cpuUsage,
    memUsage: serversTable.memUsage,
    diskUsage: serversTable.diskUsage,
    scanData: serversTable.scanData,
    lastSeen: serversTable.lastSeen,
    createdAt: serversTable.createdAt,
    groupName: serverGroupsTable.name,
  }).from(serversTable)
    .leftJoin(serverGroupsTable, eq(serversTable.groupId, serverGroupsTable.id))
    .where(eq(serversTable.orgId, orgId));

  if (req.query["groupId"]) {
    const gid = parseInt(req.query["groupId"] as string);
    servers = servers.filter(s => s.groupId === gid);
  }
  if (req.query["status"]) {
    servers = servers.filter(s => s.status === req.query["status"]);
  }
  res.json(servers);
});

router.post("/organizations/:orgId/servers", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const initialStatus = req.body.status === "online" ? "online" : req.body.status === "offline" ? "offline" : "offline";
  const [server] = await db.insert(serversTable).values({
    orgId,
    name: req.body.name,
    clientName: req.body.clientName ?? null,
    host: req.body.host,
    sshPort: req.body.sshPort ?? 22,
    sshUsername: req.body.sshUsername,
    sshAuthMethod: req.body.sshAuthMethod ?? "password",
    sshPassword: req.body.sshPassword ?? null,
    os: req.body.os ?? "ubuntu",
    osVersion: req.body.osVersion ?? null,
    groupId: req.body.groupId ? parseInt(req.body.groupId) : null,
    tags: req.body.tags ?? [],
    description: req.body.description || null,
    status: initialStatus,
  }).returning();
  if (!server) { res.status(500).json({ error: "Failed" }); return; }
  await logAudit({ orgId, userId: user.id, action: "server_registered", resourceType: "server", resourceId: server.id, resourceName: server.name });
  res.status(201).json({ ...server, groupName: null });
});

router.get("/organizations/:orgId/servers/:serverId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const serverId = parseInt(req.params["serverId"] ?? "0");
  const [server] = await db.select({
    id: serversTable.id,
    name: serversTable.name,
    clientName: serversTable.clientName,
    host: serversTable.host,
    sshPort: serversTable.sshPort,
    sshUsername: serversTable.sshUsername,
    sshAuthMethod: serversTable.sshAuthMethod,
    os: serversTable.os,
    osVersion: serversTable.osVersion,
    status: serversTable.status,
    groupId: serversTable.groupId,
    tags: serversTable.tags,
    description: serversTable.description,
    cpuUsage: serversTable.cpuUsage,
    memUsage: serversTable.memUsage,
    diskUsage: serversTable.diskUsage,
    scanData: serversTable.scanData,
    lastSeen: serversTable.lastSeen,
    createdAt: serversTable.createdAt,
    groupName: serverGroupsTable.name,
  }).from(serversTable)
    .leftJoin(serverGroupsTable, eq(serversTable.groupId, serverGroupsTable.id))
    .where(and(eq(serversTable.orgId, orgId), eq(serversTable.id, serverId)));
  if (!server) { res.status(404).json({ error: "Not found" }); return; }
  res.json(server);
});

router.patch("/organizations/:orgId/servers/:serverId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const serverId = parseInt(req.params["serverId"] ?? "0");
  const [server] = await db.update(serversTable).set({
    name: req.body.name,
    description: req.body.description,
    groupId: req.body.groupId,
    tags: req.body.tags,
  }).where(and(eq(serversTable.orgId, orgId), eq(serversTable.id, serverId))).returning();
  if (!server) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...server, groupName: null });
});

router.delete("/organizations/:orgId/servers/:serverId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const serverId = parseInt(req.params["serverId"] ?? "0");
  await db.delete(serversTable).where(and(eq(serversTable.orgId, orgId), eq(serversTable.id, serverId)));
  res.status(204).end();
});

// Real TCP port check
router.post("/organizations/:orgId/servers/:serverId/test-connection", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const serverId = parseInt(req.params["serverId"] ?? "0");
  const [server] = await db.select().from(serversTable).where(and(eq(serversTable.orgId, orgId), eq(serversTable.id, serverId))).limit(1);
  if (!server) { res.status(404).json({ error: "Server not found" }); return; }

  const start = Date.now();
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      socket.connect(server.sshPort ?? 22, server.host, () => {
        socket.destroy();
        resolve();
      });
      socket.on("timeout", () => { socket.destroy(); reject(new Error("Connection timed out after 5s")); });
      socket.on("error", (err) => reject(err));
    });
    const latencyMs = Date.now() - start;
    // Update server status to online
    await db.update(serversTable).set({ status: "online", lastSeen: new Date() }).where(eq(serversTable.id, serverId));
    res.json({ success: true, message: `Port ${server.sshPort ?? 22} reachable on ${server.host}`, latencyMs });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    // Update server status to offline
    await db.update(serversTable).set({ status: "offline" }).where(eq(serversTable.id, serverId));
    res.json({ success: false, message: err?.message ?? "Connection refused or timed out", latencyMs });
  }
});

// Health endpoint — returns stored values only (no fake data)
router.get("/organizations/:orgId/servers/:serverId/health", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const serverId = parseInt(req.params["serverId"] ?? "0");
  const [server] = await db.select().from(serversTable).where(and(eq(serversTable.orgId, orgId), eq(serversTable.id, serverId))).limit(1);
  if (!server) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    serverId,
    timestamp: new Date().toISOString(),
    cpuUsage: server.cpuUsage ?? null,
    memoryUsage: server.memUsage ?? null,
    diskUsage: server.diskUsage ?? null,
    lastSeen: server.lastSeen ?? null,
    status: server.status,
  });
});

router.post("/organizations/:orgId/servers/:serverId/scan", async (req, res) => {
  const serverId = parseInt(req.params["serverId"] ?? "0");
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const [server] = await db.select().from(serversTable).where(and(eq(serversTable.orgId, orgId), eq(serversTable.id, serverId))).limit(1);
  if (!server) { res.status(404).json({ error: "Not found" }); return; }
  // Scan endpoint — returns placeholder; real SSH scan happens via the terminal
  await new Promise(r => setTimeout(r, 500));
  res.json({
    serverId,
    scannedAt: new Date().toISOString(),
    message: "Connect via SSH terminal to run a real system scan",
  });
});

// Server Groups
router.get("/organizations/:orgId/server-groups", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const groups = await db.select().from(serverGroupsTable).where(eq(serverGroupsTable.orgId, orgId));
  const result = await Promise.all(groups.map(async (g) => {
    const servers = await db.select().from(serversTable).where(and(eq(serversTable.groupId, g.id), eq(serversTable.orgId, orgId)));
    return { ...g, serverCount: servers.length };
  }));
  res.json(result);
});

router.post("/organizations/:orgId/server-groups", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const [group] = await db.insert(serverGroupsTable).values({
    orgId,
    name: req.body.name,
    description: req.body.description,
    color: req.body.color,
  }).returning();
  if (!group) { res.status(500).json({ error: "Failed" }); return; }
  res.status(201).json({ ...group, serverCount: 0 });
});

router.patch("/organizations/:orgId/server-groups/:groupId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const groupId = parseInt(req.params["groupId"] ?? "0");
  const [group] = await db.update(serverGroupsTable).set({
    name: req.body.name,
    description: req.body.description,
    color: req.body.color,
  }).where(and(eq(serverGroupsTable.orgId, orgId), eq(serverGroupsTable.id, groupId))).returning();
  if (!group) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...group, serverCount: 0 });
});

router.delete("/organizations/:orgId/server-groups/:groupId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const groupId = parseInt(req.params["groupId"] ?? "0");
  await db.delete(serverGroupsTable).where(and(eq(serverGroupsTable.orgId, orgId), eq(serverGroupsTable.id, groupId)));
  res.status(204).end();
});

export default router;
