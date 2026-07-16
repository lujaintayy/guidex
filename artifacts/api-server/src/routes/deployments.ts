import { Router } from "express";
import { db } from "@workspace/db";
import { deploymentsTable, deploymentLogsTable, deploymentStepsTable, serversTable, templatesTable, usersTable } from "@workspace/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router = Router();
router.use(authMiddleware);

async function enrichDeployment(d: typeof deploymentsTable.$inferSelect) {
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, d.serverId)).limit(1);
  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, d.templateId)).limit(1);
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, d.createdById)).limit(1);
  const approver = d.approvedById
    ? (await db.select().from(usersTable).where(eq(usersTable.id, d.approvedById)).limit(1))[0]
    : null;
  return {
    ...d,
    serverName: server?.name ?? "",
    serverHost: server?.host ?? "",
    templateName: template?.name ?? "",
    templateSoftware: template?.software ?? "",
    createdByName: creator?.name ?? "",
    approvedByName: approver?.name ?? null,
  };
}

router.get("/organizations/:orgId/deployments/recent", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const deployments = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.orgId, orgId))
    .orderBy(desc(deploymentsTable.createdAt))
    .limit(10);
  const enriched = await Promise.all(deployments.map(enrichDeployment));
  res.json(enriched);
});

router.get("/organizations/:orgId/deployments/stats", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const all = await db.select().from(deploymentsTable).where(eq(deploymentsTable.orgId, orgId));
  const total = all.length;
  const completed = all.filter(d => d.status === "completed").length;
  const failed = all.filter(d => d.status === "failed").length;
  const running = all.filter(d => d.status === "running").length;
  const rolledBack = all.filter(d => d.status === "rolled_back").length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;
  const durations = all.filter(d => d.duration).map(d => d.duration as number);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  res.json({ total, completed, failed, running, rolledBack, successRate, avgDuration, byStatus: {}, byDay: [] });
});

router.get("/organizations/:orgId/deployments", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  let deployments = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.orgId, orgId))
    .orderBy(desc(deploymentsTable.createdAt))
    .limit(parseInt(req.query["limit"] as string ?? "50"));
  if (req.query["status"]) deployments = deployments.filter(d => d.status === req.query["status"]);
  if (req.query["serverId"]) deployments = deployments.filter(d => d.serverId === parseInt(req.query["serverId"] as string));
  const enriched = await Promise.all(deployments.map(enrichDeployment));
  res.json(enriched);
});

router.post("/organizations/:orgId/deployments", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const [deployment] = await db.insert(deploymentsTable).values({
    orgId,
    serverId: req.body.serverId,
    templateId: req.body.templateId,
    name: req.body.name,
    description: req.body.description,
    createdById: user.id,
    status: "pending",
    configOverrides: req.body.configOverrides ?? {},
    scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
  }).returning();
  if (!deployment) { res.status(500).json({ error: "Failed" }); return; }
  // Auto-generate AI plan (simulated)
  const plan = {
    summary: `Deploy ${req.body.name} to target server`,
    whyRequired: "Required to provision the requested software component on the target infrastructure.",
    benefits: ["Automated deployment with rollback support", "Pre-validated configuration", "Full audit trail"],
    risks: [{ description: "Service interruption during installation", severity: "medium", mitigation: "Schedule during maintenance window" }],
    dependencies: ["OS package repositories accessible", "Sufficient disk space (min 2GB)", "Target ports not blocked by firewall"],
    estimatedDuration: 300,
    estimatedDowntime: 30,
    requiredPorts: [80, 443],
    requiredPackages: ["curl", "wget", "apt-transport-https"],
    backupRecommendations: ["Snapshot server before deployment", "Backup existing configuration files"],
    rollbackStrategy: "Restore previous configuration from backup. Stop new service, re-enable old configuration, restart affected services.",
    expectedOutcome: "Software successfully installed, service running and accessible on configured ports.",
    steps: [
      { order: 1, name: "Pre-flight check", description: "Verify server connectivity and prerequisites", command: "systemctl status && df -h && free -m", whyRequired: "Ensure server is healthy before starting", estimatedSeconds: 10, rollbackCommand: "" },
      { order: 2, name: "Update package list", description: "Refresh OS package repositories", command: "apt-get update -y", whyRequired: "Ensure latest package versions are available", estimatedSeconds: 30, rollbackCommand: "" },
      { order: 3, name: "Install dependencies", description: "Install required system packages", command: "apt-get install -y curl wget", whyRequired: "Required by the installation process", estimatedSeconds: 60, rollbackCommand: "apt-get remove -y curl wget" },
      { order: 4, name: "Install software", description: "Install and configure the main software package", command: "apt-get install -y <software>", whyRequired: "Core installation step", estimatedSeconds: 120, rollbackCommand: "apt-get remove -y <software>" },
      { order: 5, name: "Configure and start", description: "Apply configuration and start services", command: "systemctl enable <service> && systemctl start <service>", whyRequired: "Enable service on boot and start it", estimatedSeconds: 20, rollbackCommand: "systemctl stop <service> && systemctl disable <service>" },
      { order: 6, name: "Verify installation", description: "Run health checks to confirm successful install", command: "systemctl is-active <service> && curl -s http://localhost/health", whyRequired: "Confirm installation is working correctly", estimatedSeconds: 15, rollbackCommand: "" },
    ],
  };
  await db.update(deploymentsTable).set({ status: "awaiting_approval", plan: plan as any }).where(eq(deploymentsTable.id, deployment.id));
  await logAudit({ orgId, userId: user.id, action: "deployment_created", resourceType: "deployment", resourceId: deployment.id, resourceName: deployment.name });
  const enriched = await enrichDeployment({ ...deployment, status: "awaiting_approval", plan: plan as any });
  res.status(201).json(enriched);
});

router.get("/organizations/:orgId/deployments/:deploymentId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const deploymentId = parseInt(req.params["deploymentId"] ?? "0");
  const [d] = await db.select().from(deploymentsTable).where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.id, deploymentId))).limit(1);
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichDeployment(d));
});

router.post("/organizations/:orgId/deployments/:deploymentId/approve", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const deploymentId = parseInt(req.params["deploymentId"] ?? "0");
  const user = getUser(req);
  const decision = req.body.decision;
  const newStatus = decision === "approved" ? "approved" : "rejected";
  const [d] = await db.update(deploymentsTable).set({
    status: newStatus,
    approvedById: user.id,
    approvalComment: req.body.comment,
  }).where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.id, deploymentId))).returning();
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  await logAudit({ orgId, userId: user.id, action: `deployment_${decision}`, resourceType: "deployment", resourceId: deploymentId });
  res.json(await enrichDeployment(d));
});

router.post("/organizations/:orgId/deployments/:deploymentId/execute", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const deploymentId = parseInt(req.params["deploymentId"] ?? "0");
  const user = getUser(req);
  const [d] = await db.update(deploymentsTable).set({
    status: "running",
    startedAt: new Date(),
  }).where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.id, deploymentId))).returning();
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  // Seed some logs and steps
  const steps = (d.plan as any)?.steps ?? [];
  for (const step of steps) {
    await db.insert(deploymentStepsTable).values({ deploymentId, order: step.order, name: step.name, description: step.description, command: step.command, status: "pending" });
  }
  await db.insert(deploymentLogsTable).values({ deploymentId, level: "info", message: "Deployment execution started", stepName: null });
  await logAudit({ orgId, userId: user.id, action: "deployment_executed", resourceType: "deployment", resourceId: deploymentId });
  res.json(await enrichDeployment(d));
});

router.post("/organizations/:orgId/deployments/:deploymentId/rollback", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const deploymentId = parseInt(req.params["deploymentId"] ?? "0");
  const user = getUser(req);
  const [d] = await db.update(deploymentsTable).set({ status: "rolling_back" })
    .where(and(eq(deploymentsTable.orgId, orgId), eq(deploymentsTable.id, deploymentId))).returning();
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  await logAudit({ orgId, userId: user.id, action: "deployment_rollback_initiated", resourceType: "deployment", resourceId: deploymentId });
  res.json(await enrichDeployment(d));
});

router.get("/organizations/:orgId/deployments/:deploymentId/logs", async (req, res) => {
  const deploymentId = parseInt(req.params["deploymentId"] ?? "0");
  const logs = await db.select().from(deploymentLogsTable).where(eq(deploymentLogsTable.deploymentId, deploymentId));
  res.json(logs);
});

router.get("/organizations/:orgId/deployments/:deploymentId/steps", async (req, res) => {
  const deploymentId = parseInt(req.params["deploymentId"] ?? "0");
  const steps = await db.select().from(deploymentStepsTable)
    .where(eq(deploymentStepsTable.deploymentId, deploymentId))
    .orderBy(deploymentStepsTable.order);
  res.json(steps);
});

export default router;
