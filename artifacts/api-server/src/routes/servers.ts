import { Router } from "express";
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
    host: serversTable.host,
    sshPort: serversTable.sshPort,
    sshUsername: serversTable.sshUsername,
    os: serversTable.os,
    osVersion: serversTable.osVersion,
    status: serversTable.status,
    groupId: serversTable.groupId,
    tags: serversTable.tags,
    description: serversTable.description,
    cpuUsage: serversTable.cpuUsage,
    memUsage: serversTable.memUsage,
    diskUsage: serversTable.diskUsage,
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
  const [server] = await db.insert(serversTable).values({
    orgId,
    name: req.body.name,
    host: req.body.host,
    sshPort: req.body.sshPort ?? 22,
    sshUsername: req.body.sshUsername,
    os: req.body.os,
    osVersion: req.body.osVersion,
    groupId: req.body.groupId ?? null,
    tags: req.body.tags ?? [],
    description: req.body.description,
    status: "unknown",
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
    host: serversTable.host,
    sshPort: serversTable.sshPort,
    sshUsername: serversTable.sshUsername,
    os: serversTable.os,
    osVersion: serversTable.osVersion,
    status: serversTable.status,
    groupId: serversTable.groupId,
    tags: serversTable.tags,
    description: serversTable.description,
    cpuUsage: serversTable.cpuUsage,
    memUsage: serversTable.memUsage,
    diskUsage: serversTable.diskUsage,
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

router.post("/organizations/:orgId/servers/:serverId/test-connection", async (req, res) => {
  // Simulated connection test
  await new Promise(r => setTimeout(r, 500));
  res.json({ success: true, message: "SSH connection successful", latencyMs: 48 });
});

router.get("/organizations/:orgId/servers/:serverId/health", async (req, res) => {
  const serverId = parseInt(req.params["serverId"] ?? "0");
  // Return realistic simulated health data
  res.json({
    serverId,
    timestamp: new Date().toISOString(),
    cpuUsage: 23 + Math.floor(Math.random() * 40),
    memoryUsage: 55 + Math.floor(Math.random() * 20),
    memoryTotal: 16384,
    memoryUsed: 8960,
    diskUsage: 42 + Math.floor(Math.random() * 20),
    diskTotal: 500,
    diskUsed: 210,
    networkIn: 1.2,
    networkOut: 0.8,
    loadAverage: [1.2, 1.5, 1.3],
    uptime: 1209600,
    runningProcesses: 142,
    runningServices: ["nginx", "postgresql", "redis", "sshd", "cron"],
    openPorts: [22, 80, 443, 5432, 6379],
  });
});

router.post("/organizations/:orgId/servers/:serverId/scan", async (req, res) => {
  const serverId = parseInt(req.params["serverId"] ?? "0");
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
  await new Promise(r => setTimeout(r, 1000));
  res.json({
    serverId,
    scannedAt: new Date().toISOString(),
    os: server?.os ?? "ubuntu",
    osVersion: "24.04 LTS",
    kernel: "6.8.0-49-generic",
    cpuModel: "Intel Xeon E5-2680 v4",
    cpuCores: 8,
    totalMemoryMb: 16384,
    totalDiskGb: 500,
    packages: [
      { name: "nginx", version: "1.24.0" },
      { name: "postgresql", version: "16.3" },
      { name: "docker", version: "27.1.1" },
      { name: "python3", version: "3.12.3" },
    ],
    services: [
      { name: "nginx", status: "active" },
      { name: "postgresql", status: "active" },
      { name: "docker", status: "active" },
      { name: "sshd", status: "active" },
    ],
    ports: [22, 80, 443, 5432, 6379],
    dockerInstalled: true,
    kubernetesInstalled: false,
    firewallEnabled: true,
    sslCertificates: [
      { domain: "app.example.com", expiresAt: "2025-03-15T00:00:00Z" },
    ],
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
