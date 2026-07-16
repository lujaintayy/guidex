import { Router } from "express";
import { db } from "@workspace/db";
import { organizationsTable, orgMembersTable, usersTable, serversTable, deploymentsTable, monitoringAlertsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router = Router();
router.use(authMiddleware);

router.get("/organizations", async (req, res) => {
  const user = getUser(req);
  const memberships = await db
    .select({ orgId: orgMembersTable.orgId })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.userId, user.id));
  const orgIds = memberships.map(m => m.orgId);
  if (orgIds.length === 0) { res.json([]); return; }
  const orgs = await db.select().from(organizationsTable).where(
    sql`${organizationsTable.id} = ANY(ARRAY[${sql.join(orgIds.map(id => sql`${id}`), sql`, `)}]::int[])`
  );
  const result = await Promise.all(orgs.map(async (org) => {
    const [mc] = await db.select({ c: count() }).from(orgMembersTable).where(eq(orgMembersTable.orgId, org.id));
    const [sc] = await db.select({ c: count() }).from(serversTable).where(eq(serversTable.orgId, org.id));
    return { ...org, memberCount: mc?.c ?? 0, serverCount: sc?.c ?? 0 };
  }));
  res.json(result);
});

router.post("/organizations", async (req, res) => {
  const user = getUser(req);
  const [org] = await db.insert(organizationsTable).values({
    name: req.body.name,
    description: req.body.description,
    logoUrl: req.body.logoUrl,
  }).returning();
  if (!org) { res.status(500).json({ error: "Failed to create org" }); return; }
  await db.insert(orgMembersTable).values({ orgId: org.id, userId: user.id, role: "admin" });
  res.status(201).json({ ...org, memberCount: 1, serverCount: 0 });
});

router.get("/organizations/:orgId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId)).limit(1);
  if (!org) { res.status(404).json({ error: "Not found" }); return; }
  const [mc] = await db.select({ c: count() }).from(orgMembersTable).where(eq(orgMembersTable.orgId, orgId));
  const [sc] = await db.select({ c: count() }).from(serversTable).where(eq(serversTable.orgId, orgId));
  res.json({ ...org, memberCount: mc?.c ?? 0, serverCount: sc?.c ?? 0 });
});

router.patch("/organizations/:orgId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const [org] = await db.update(organizationsTable).set({
    name: req.body.name,
    description: req.body.description,
    logoUrl: req.body.logoUrl,
  }).where(eq(organizationsTable.id, orgId)).returning();
  if (!org) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...org, memberCount: 0, serverCount: 0 });
});

router.delete("/organizations/:orgId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  res.status(204).end();
});

router.get("/organizations/:orgId/stats", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const [totalServers] = await db.select({ c: count() }).from(serversTable).where(eq(serversTable.orgId, orgId));
  const [onlineServers] = await db.select({ c: count() }).from(serversTable).where(and(eq(serversTable.orgId, orgId), eq(serversTable.status, "online")));
  const [totalDeploy] = await db.select({ c: count() }).from(deploymentsTable).where(eq(deploymentsTable.orgId, orgId));
  const [activeDeploy] = await db.select({ c: count() }).from(deploymentsTable).where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.status, "running")));
  const [failedDeploy] = await db.select({ c: count() }).from(deploymentsTable).where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.status, "failed")));
  const [completedDeploy] = await db.select({ c: count() }).from(deploymentsTable).where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.status, "completed")));
  const [pendingApproval] = await db.select({ c: count() }).from(deploymentsTable).where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.status, "awaiting_approval")));
  const [alertCount] = await db.select({ c: count() }).from(monitoringAlertsTable).where(and(eq(monitoringAlertsTable.orgId, orgId), eq(monitoringAlertsTable.resolved, false)));
  const total = totalDeploy?.c ?? 0;
  const completed = completedDeploy?.c ?? 0;
  const successRate = total > 0 ? Math.round((Number(completed) / Number(total)) * 100) : 100;
  res.json({
    totalServers: totalServers?.c ?? 0,
    onlineServers: onlineServers?.c ?? 0,
    offlineServers: Number(totalServers?.c ?? 0) - Number(onlineServers?.c ?? 0),
    activeDeployments: activeDeploy?.c ?? 0,
    failedDeployments: failedDeploy?.c ?? 0,
    totalDeployments: total,
    pendingApprovals: pendingApproval?.c ?? 0,
    alertCount: alertCount?.c ?? 0,
    successRate,
  });
});

router.get("/organizations/:orgId/members", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const members = await db
    .select({
      userId: orgMembersTable.userId,
      name: usersTable.name,
      email: usersTable.email,
      role: orgMembersTable.role,
      joinedAt: orgMembersTable.joinedAt,
    })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(orgMembersTable.userId, usersTable.id))
    .where(eq(orgMembersTable.orgId, orgId));
  res.json(members);
});

router.post("/organizations/:orgId/members", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, req.body.email)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }
  await db.insert(orgMembersTable).values({ orgId, userId: existing.id, role: req.body.role ?? "engineer" });
  await logAudit({ orgId, userId: user.id, action: "member_added", resourceType: "user", resourceId: existing.id, resourceName: existing.name });
  res.status(201).json({ userId: existing.id, name: existing.name, email: existing.email, role: req.body.role, joinedAt: new Date() });
});

router.patch("/organizations/:orgId/members/:userId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const userId = parseInt(req.params["userId"] ?? "0");
  await db.update(orgMembersTable).set({ role: req.body.role }).where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, userId)));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ userId: user.id, name: user.name, email: user.email, role: req.body.role, joinedAt: new Date() });
});

router.delete("/organizations/:orgId/members/:userId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const userId = parseInt(req.params["userId"] ?? "0");
  await db.delete(orgMembersTable).where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, userId)));
  res.status(204).end();
});

export default router;
