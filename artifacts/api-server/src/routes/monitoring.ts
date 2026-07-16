import { Router } from "express";
import { db } from "@workspace/db";
import { serversTable, monitoringAlertsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

router.get("/organizations/:orgId/monitoring/overview", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const servers = await db.select().from(serversTable).where(eq(serversTable.orgId, orgId));
  const alerts = await db.select().from(monitoringAlertsTable).where(and(eq(monitoringAlertsTable.orgId, orgId), eq(monitoringAlertsTable.resolved, false)));
  const serverStatuses = servers.map(s => {
    const serverAlerts = alerts.filter(a => a.serverId === s.id);
    return {
      serverId: s.id,
      name: s.name,
      host: s.host,
      status: s.status,
      cpuUsage: s.cpuUsage,
      memUsage: s.memUsage,
      diskUsage: s.diskUsage,
      uptime: 1209600,
      alertCount: serverAlerts.length,
    };
  });
  const online = servers.filter(s => s.status === "online").length;
  const offline = servers.filter(s => s.status === "offline").length;
  const cpuVals = servers.filter(s => s.cpuUsage != null).map(s => s.cpuUsage as number);
  const memVals = servers.filter(s => s.memUsage != null).map(s => s.memUsage as number);
  res.json({
    servers: serverStatuses,
    alerts: alerts.map(a => ({ ...a, serverName: servers.find(s => s.id === a.serverId)?.name ?? "" })),
    totalOnline: online,
    totalOffline: offline,
    avgCpuUsage: cpuVals.length > 0 ? Math.round(cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length) : 0,
    avgMemUsage: memVals.length > 0 ? Math.round(memVals.reduce((a, b) => a + b, 0) / memVals.length) : 0,
  });
});

router.get("/organizations/:orgId/monitoring/servers/:serverId/metrics", async (req, res) => {
  const serverId = parseInt(req.params["serverId"] ?? "0");
  const period = (req.query["period"] as string) ?? "1h";
  const pointCounts: Record<string, number> = { "1h": 12, "6h": 24, "24h": 48, "7d": 84 };
  const points = pointCounts[period] ?? 12;
  const now = Date.now();
  const intervalMs = period === "7d" ? 2 * 60 * 60 * 1000 : period === "24h" ? 30 * 60 * 1000 : period === "6h" ? 15 * 60 * 1000 : 5 * 60 * 1000;
  const dataPoints = Array.from({ length: points }, (_, i) => ({
    timestamp: new Date(now - (points - i) * intervalMs).toISOString(),
    cpuUsage: 20 + Math.random() * 50,
    memUsage: 50 + Math.random() * 30,
    diskUsage: 40 + Math.random() * 20,
    networkIn: Math.random() * 5,
    networkOut: Math.random() * 3,
  }));
  res.json({ serverId, period, dataPoints });
});

router.get("/organizations/:orgId/monitoring/alerts", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  let alerts = await db.select({
    id: monitoringAlertsTable.id,
    serverId: monitoringAlertsTable.serverId,
    type: monitoringAlertsTable.type,
    severity: monitoringAlertsTable.severity,
    message: monitoringAlertsTable.message,
    resolved: monitoringAlertsTable.resolved,
    triggeredAt: monitoringAlertsTable.triggeredAt,
    resolvedAt: monitoringAlertsTable.resolvedAt,
    serverName: serversTable.name,
  }).from(monitoringAlertsTable)
    .innerJoin(serversTable, eq(monitoringAlertsTable.serverId, serversTable.id))
    .where(eq(monitoringAlertsTable.orgId, orgId));
  if (req.query["severity"]) {
    alerts = alerts.filter(a => a.severity === req.query["severity"]);
  }
  res.json(alerts);
});

export default router;
