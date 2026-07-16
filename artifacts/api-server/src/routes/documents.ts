import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, reportsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

const DOC_TEMPLATES: Record<string, (title: string) => string> = {
  deployment_report: (title) => `# Deployment Report: ${title}\n\n## Summary\nDeployment completed successfully on ${new Date().toLocaleDateString()}.\n\n## Steps Executed\n1. Pre-flight check — PASSED\n2. Package installation — PASSED\n3. Configuration — PASSED\n4. Service startup — PASSED\n5. Health verification — PASSED\n\n## Metrics\n- **Duration:** 5 minutes 32 seconds\n- **Downtime:** ~30 seconds\n- **Success Rate:** 100%\n\n## Post-Deployment Verification\n- Service status: Active\n- Port accessibility: Confirmed\n- Health endpoint: Responding\n\n## Conclusion\nThe deployment was completed without issues. The service is fully operational.`,
  sop: (title) => `# Standard Operating Procedure: ${title}\n\n## Purpose\nThis SOP defines the standardized process for ${title.toLowerCase()}.\n\n## Scope\nApplicable to all engineers with infrastructure access.\n\n## Prerequisites\n- Server access via SSH\n- Appropriate role permissions\n- Change request approved\n\n## Procedure\n\n### 1. Pre-flight Checks\n\`\`\`bash\n# Verify system health\ndf -h && free -m && uptime\n\`\`\`\n\n### 2. Execution Steps\nFollow the approved deployment plan step by step.\n\n### 3. Verification\nRun all post-deployment health checks.\n\n### 4. Rollback (if needed)\nRefer to the rollback strategy defined in the deployment plan.\n\n## Approvals\n| Role | Name | Date |\n|------|------|------|\n| Engineer | | |\n| Reviewer | | |`,
  architecture_doc: (title) => `# Architecture Documentation: ${title}\n\n## Overview\nThis document describes the infrastructure architecture for ${title}.\n\n## Components\n- **Web Tier:** Nginx reverse proxy\n- **Application Tier:** Node.js services\n- **Data Tier:** PostgreSQL + Redis\n- **Monitoring:** Prometheus + Grafana\n\n## Network Diagram\n\`\`\`\nInternet → CloudFlare → Load Balancer → [Web-01, Web-02] → App Servers → Database Cluster\n\`\`\`\n\n## Security Boundaries\n- All traffic encrypted with TLS 1.3\n- Database access restricted to app subnet\n- SSH access via bastion host only\n\n## Disaster Recovery\n- RPO: 4 hours | RTO: 1 hour\n- Daily automated backups retained 30 days`,
  troubleshooting_report: (title) => `# Troubleshooting Report: ${title}\n\n## Incident Summary\n**Date:** ${new Date().toLocaleDateString()}\n**Severity:** Medium\n**Status:** Resolved\n\n## Root Cause\nIdentified as a configuration drift issue causing service interruption.\n\n## Timeline\n| Time | Event |\n|------|-------|\n| T+0 | Alert triggered |\n| T+5m | Engineer engaged |\n| T+15m | Root cause identified |\n| T+20m | Fix applied |\n| T+25m | Service restored |\n\n## Resolution\nReverted configuration to last known good state and restarted affected services.\n\n## Prevention\n- Implement configuration drift monitoring\n- Enforce change management process\n- Add automated rollback triggers`,
};

router.get("/organizations/:orgId/documents", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  let docs = await db.select().from(documentsTable).where(eq(documentsTable.orgId, orgId));
  if (req.query["type"]) docs = docs.filter(d => d.type === req.query["type"]);
  res.json(docs);
});

router.post("/organizations/:orgId/documents", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const { type, title, deploymentId, serverId, prompt } = req.body;
  const generator = DOC_TEMPLATES[type];
  const content = generator ? generator(title) : `# ${title}\n\nGenerated documentation for ${type}.\n\n${prompt ?? ""}`;
  const [doc] = await db.insert(documentsTable).values({
    orgId, type, title, content,
    format: "markdown",
    relatedDeploymentId: deploymentId ?? null,
    relatedServerId: serverId ?? null,
  }).returning();
  if (!doc) { res.status(500).json({ error: "Failed" }); return; }
  res.status(201).json(doc);
});

router.get("/organizations/:orgId/documents/:documentId", async (req, res) => {
  const documentId = parseInt(req.params["documentId"] ?? "0");
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, documentId)).limit(1);
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(doc);
});

router.delete("/organizations/:orgId/documents/:documentId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const documentId = parseInt(req.params["documentId"] ?? "0");
  await db.delete(documentsTable).where(and(eq(documentsTable.id, documentId), eq(documentsTable.orgId, orgId)));
  res.status(204).end();
});

// Reports
router.get("/organizations/:orgId/reports", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.orgId, orgId));
  res.json(reports);
});

router.post("/organizations/:orgId/reports", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const { type, title, dateFrom, dateTo, serverId } = req.body;
  const [report] = await db.insert(reportsTable).values({
    orgId, type, title,
    summary: `${type.replace("_", " ")} report generated for the period ${dateFrom ?? "all time"} to ${dateTo ?? "present"}.`,
    data: JSON.stringify({ generated: new Date(), filters: { dateFrom, dateTo, serverId } }),
  }).returning();
  if (!report) { res.status(500).json({ error: "Failed" }); return; }
  res.status(201).json({ ...report, data: JSON.parse(report.data) });
});

export default router;
