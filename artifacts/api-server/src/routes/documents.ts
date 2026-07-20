import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, reportsTable, serversTable, deploymentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import Anthropic from "@anthropic-ai/sdk";

let _claude: Anthropic | null = null;
function getClaude(): Anthropic {
  if (!_claude) {
    const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
    const baseURL = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
    if (!apiKey || !baseURL) throw new Error("Anthropic not configured");
    _claude = new Anthropic({ apiKey, baseURL });
  }
  return _claude;
}

async function claudeGenerate(prompt: string, maxTokens = 8192): Promise<string> {
  const response = await getClaude().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content
    .filter((b) => b.type === "text")
    .map((b: any) => b.text)
    .join("")
    .trim();
}

const router = Router();
router.use(authMiddleware);

// Per-type AI prompts — Claude fills every section using real server/deployment data
const DOC_PROMPTS: Record<string, (title: string, ctx: string, date: string) => string> = {
  deployment_report: (title, ctx, date) =>
    `You are a senior DevOps engineer writing an official Deployment Report.

Title: "${title}"
Date: ${date}
${ctx}

Write a complete, professional Deployment Report in Markdown. Fill every field with realistic, specific content based on the context above. Do NOT use placeholder brackets like [YOUR NAME] or [TODO]. Make reasonable assumptions where data is missing.

Include these sections:
1. Header (title, date, server/deployment names, engineer name inferred from context, status)
2. Executive Summary (2-3 sentences on what was deployed and outcome)
3. Pre-Deployment Checklist (specific items checked for this server/deployment)
4. Steps Executed (numbered table with realistic step names, statuses, durations, notes)
5. Metrics (deployment duration, downtime, services affected)
6. Post-Deployment Verification (specific checks for this server's OS and services)
7. Issues Encountered (realistic "None" if context shows a healthy server)
8. Rollback Plan (specific steps if rollback were needed)
9. Conclusion & Next Steps

Return only the Markdown document.`,

  sop: (title, ctx, date) =>
    `You are a senior systems administrator writing an official Standard Operating Procedure.

Title: "${title}"
Date: ${date}
${ctx}

Write a complete, professional SOP document in Markdown. Fill every section with specific, actionable content. Use actual commands appropriate for the server's OS (${ctx.includes("ubuntu") || ctx.includes("debian") ? "Ubuntu/Debian — use apt" : ctx.includes("rhel") || ctx.includes("centos") ? "RHEL/CentOS — use dnf/yum" : "Linux"}). Do NOT use placeholder brackets.

Include these sections:
1. Header (document ID, version, effective date, review date, owner)
2. Purpose (specific to the title)
3. Scope (which servers/environments this covers)
4. Prerequisites (specific access requirements and tools)
5. Procedure (numbered steps with real bash commands, expected outputs, failure actions)
6. Verification Steps (specific commands to confirm success)
7. Rollback Procedure (exact commands to undo)
8. Troubleshooting (common failure scenarios and fixes)
9. Approvals table

Return only the Markdown document.`,

  architecture_doc: (title, ctx, date) =>
    `You are a senior solutions architect writing official Architecture Documentation.

Title: "${title}"
Date: ${date}
${ctx}

Write a complete, professional Architecture Documentation in Markdown. Fill every section with specific technical content based on the server/infrastructure context. Do NOT use placeholder brackets.

Include these sections:
1. Header (version, date, status, author)
2. Executive Overview (what this system does)
3. Architecture Diagram (ASCII art showing the actual server(s), connections, and components)
4. Component Inventory (table listing each component, technology, purpose, and host)
5. Network & Security (actual ports, firewall rules appropriate for this OS, TLS config)
6. Data Flow (how requests flow through the system)
7. High Availability & Scaling Strategy
8. Disaster Recovery (RPO/RTO targets, backup strategy for this server's OS)
9. Monitoring & Alerting (what metrics to watch, alert thresholds)
10. Known Limitations & Technical Debt

Return only the Markdown document.`,

  troubleshooting_report: (title, ctx, date) =>
    `You are a senior DevOps engineer writing a Troubleshooting Report / Incident Post-Mortem.

Title: "${title}"
Date: ${date}
${ctx}

Write a complete, professional Troubleshooting Report in Markdown. Fill every section with realistic, specific content. Use actual command examples appropriate for the server's OS. Do NOT use placeholder brackets.

Include these sections:
1. Header (incident date, severity, status, reporter, assigned to)
2. Incident Summary (what happened, first observed, affected systems, business impact)
3. Timeline (table with realistic T+X events, actions, actors)
4. Diagnostic Commands Used (real bash commands with example outputs)
5. Root Cause Analysis (specific root cause and contributing factors)
6. Resolution Steps (exact commands executed to resolve)
7. Prevention & Follow-up Actions (checkboxed action items)
8. Lessons Learned

Return only the Markdown document.`,

  srs: (title, ctx, date) =>
    `You are a senior software engineer writing a Software Requirements Specification (SRS).

Title: "${title}"
Date: ${date}
${ctx}

Write a complete, professional SRS document in Markdown. Fill every section with specific, realistic content. Do NOT use placeholder brackets like [YOUR NAME] or [TODO].

Include these sections:
1. Introduction (Purpose, Scope, Definitions & Acronyms, References)
2. Overall Description (Product Perspective, Functions, User Classes, Operating Environment, Constraints)
3. Functional Requirements (numbered FR-001 onward with priority and acceptance criteria)
4. Non-Functional Requirements (Performance, Security, Availability, Scalability, Maintainability)
5. System Interfaces (User, Software, Hardware, Communication)
6. Data Requirements (data models, retention, privacy)
7. Constraints & Assumptions
8. Appendix

Return only the Markdown document.`,
};

router.get("/organizations/:orgId/documents", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  let docs = await db.select().from(documentsTable).where(eq(documentsTable.orgId, orgId));
  if (req.query["type"]) docs = docs.filter(d => d.type === req.query["type"]);
  res.json(docs);
});

router.post("/organizations/:orgId/documents", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const { type, title, prompt } = req.body;

  // Coerce FK fields to integer or null — never pass empty strings to integer columns
  const serverId: number | null = req.body.serverId ? parseInt(req.body.serverId) : null;
  const deploymentId: number | null = req.body.deploymentId ? parseInt(req.body.deploymentId) : null;

  // Fetch related records to build rich context
  let server: any = null;
  let deployment: any = null;
  if (serverId) {
    const [s] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
    server = s ?? null;
  }
  if (deploymentId) {
    const [d] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId)).limit(1);
    deployment = d ?? null;
  }

  // Build context block from actual server/deployment data
  const ctxLines: string[] = [];
  if (server) {
    ctxLines.push(`Server Name: ${server.name}`);
    if (server.clientName) ctxLines.push(`Client: ${server.clientName}`);
    ctxLines.push(`Host / IP: ${server.host}`);
    ctxLines.push(`OS: ${server.os}${server.osVersion ? " " + server.osVersion : ""}`);
    ctxLines.push(`SSH Port: ${server.sshPort ?? 22}  Username: ${server.sshUsername ?? "root"}`);
    ctxLines.push(`Status: ${server.status}`);
    if (server.cpuUsage != null) ctxLines.push(`CPU Usage: ${server.cpuUsage}%`);
    if (server.memUsage != null) ctxLines.push(`Memory Usage: ${server.memUsage}%`);
    if (server.diskUsage != null) ctxLines.push(`Disk Usage: ${server.diskUsage}%`);
    if (server.description) ctxLines.push(`Description: ${server.description}`);
    if (server.tags?.length) ctxLines.push(`Tags: ${(server.tags as string[]).join(", ")}`);
    if (server.lastSeen) ctxLines.push(`Last Seen: ${new Date(server.lastSeen).toLocaleString()}`);
  }
  if (deployment) {
    ctxLines.push(`Related Deployment: ${(deployment as any).name ?? deployment.id}`);
    if ((deployment as any).status) ctxLines.push(`Deployment Status: ${(deployment as any).status}`);
    if ((deployment as any).environment) ctxLines.push(`Deployment Environment: ${(deployment as any).environment}`);
  }
  if (prompt) ctxLines.push(`Additional user context: ${prompt}`);

  const contextBlock = ctxLines.length
    ? `\nInfrastructure context:\n${ctxLines.map(l => `- ${l}`).join("\n")}`
    : "\nNo specific server context provided — write for a general Linux infrastructure environment.";

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Generate content with AI for all document types
  let content: string;
  const promptFn = DOC_PROMPTS[type];
  if (promptFn) {
    try {
      const aiPrompt = promptFn(title, contextBlock, today);
      content = await claudeGenerate(aiPrompt);
      if (!content) throw new Error("Empty response from Claude");
    } catch (err: any) {
      console.error(`[documents] AI generation failed for type=${type}:`, err?.message ?? err);
      content = `# ${title}\n\n*Document generation failed. Please try again.*\n\n${contextBlock}`;
    }
  } else {
    // Unknown type — just store title + prompt
    content = `# ${title}\n\n${prompt ?? ""}`;
  }

  const [doc] = await db.insert(documentsTable).values({
    orgId,
    type,
    title,
    content,
    format: "markdown",
    relatedDeploymentId: deploymentId,
    relatedServerId: serverId,
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

// ── Report AI prompts ─────────────────────────────────────────────────────────
const REPORT_PROMPTS: Record<string, (title: string, ctx: string, period: string, date: string) => string> = {
  deployment_summary: (title, ctx, period, date) =>
    `You are a senior DevOps engineer writing a Deployment Summary Report.

Title: "${title}"
Date: ${date}${period}
${ctx}

Write a complete, professional Deployment Summary Report in Markdown. Use the real server data above — do NOT use placeholder brackets.

Include:
1. Executive Summary (2-3 sentences on deployment health)
2. Deployment Statistics (table: total deployments, success rate, avg duration, rollbacks — use realistic numbers based on server status)
3. Server Status Overview (table with server name, OS, host, current status, CPU/memory/disk)
4. Recent Deployment Activity (timeline of likely recent deployments based on server context)
5. Key Findings & Observations
6. Failed Deployments & Issues (none if server is healthy)
7. Recommendations & Next Steps

Return only the Markdown report.`,

  server_health: (title, ctx, period, date) =>
    `You are a senior systems administrator writing a Server Health Report.

Title: "${title}"
Date: ${date}${period}
${ctx}

Write a complete, professional Server Health Report in Markdown. Use the actual metrics from the server data above — do NOT use placeholder brackets.

Include:
1. Executive Summary (overall health assessment — healthy/warning/critical based on metrics)
2. Server Inventory (table: name, host, OS, status, last seen)
3. Resource Utilization (table: CPU%, Memory%, Disk% with health indicators ✅⚠️🔴 based on actual values)
4. Health Score per Server (calculated from the metrics — e.g. CPU<70% = green, 70-85% = yellow, >85% = red)
5. Performance Trends & Analysis
6. Alerts & Threshold Violations (based on actual metric values)
7. Maintenance Recommendations (specific to the OS and current resource usage)
8. Action Items

Return only the Markdown report.`,

  compliance: (title, ctx, period, date) =>
    `You are a security compliance engineer writing a Compliance Report.

Title: "${title}"
Date: ${date}${period}
${ctx}

Write a complete, professional Compliance Report in Markdown. Use the actual server data above — do NOT use placeholder brackets.

Include:
1. Executive Summary (overall compliance posture)
2. Scope (servers and systems covered)
3. Compliance Checklist (table with control, status ✅/⚠️/❌, and notes — appropriate for the server OS)
4. Security Controls Assessment:
   - Authentication & Access Control
   - Patch Management (reference actual OS version)
   - Network Security (SSH port, firewall)
   - Encryption & Data Protection
   - Logging & Monitoring
   - Backup & Recovery
5. Findings & Risk Register (table: finding, severity, status, remediation)
6. Remediation Roadmap
7. Sign-off & Next Audit Date

Return only the Markdown report.`,

  incident_report: (title, ctx, period, date) =>
    `You are a senior incident manager writing an Incident Report / Post-Mortem.

Title: "${title}"
Date: ${date}${period}
${ctx}

Write a complete, professional Incident Report in Markdown. Use the actual server data above — do NOT use placeholder brackets. Make realistic assumptions where specific incident details are unavailable.

Include:
1. Incident Summary (what, when, impact, duration)
2. Affected Systems (table with the actual servers from context)
3. Timeline (T+0 through resolution — realistic events based on server OS and status)
4. Diagnostic Commands Used (real bash commands for the server's OS with realistic outputs)
5. Root Cause Analysis (5-Why methodology)
6. Impact Assessment (users affected, data integrity, SLA breach)
7. Resolution Steps (specific commands that resolved the issue)
8. Prevention Measures (checkboxed action items)
9. Lessons Learned

Return only the Markdown report.`,

  capacity_planning: (title, ctx, period, date) =>
    `You are a senior infrastructure architect writing a Capacity Planning Report.

Title: "${title}"
Date: ${date}${period}
${ctx}

Write a complete, professional Capacity Planning Report in Markdown. Use the actual CPU, memory, and disk metrics from the server data above — do NOT use placeholder brackets. Calculate realistic projections.

Include:
1. Executive Summary (capacity health and urgency)
2. Current Resource Baseline (table: server, CPU%, Memory%, Disk% with the actual values)
3. Utilization Analysis (which resources are at risk — threshold: warning >70%, critical >85%)
4. Growth Projections (6-month and 12-month outlook based on current usage trends)
5. Bottleneck Identification (most constrained resources per server)
6. Capacity Recommendations:
   - Immediate actions (for any >85% utilization)
   - Short-term (1-3 months)
   - Long-term (6-12 months)
7. Cost Estimates (estimated infrastructure cost to address capacity gaps)
8. Implementation Roadmap

Return only the Markdown report.`,
};

// Reports
router.get("/organizations/:orgId/reports", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.orgId, orgId));
  res.json(reports);
});

router.post("/organizations/:orgId/reports", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const { type, title, dateFrom, dateTo } = req.body;

  // Coerce FK fields
  const serverId: number | null = req.body.serverId ? parseInt(req.body.serverId) : null;
  const deploymentId: number | null = req.body.deploymentId ? parseInt(req.body.deploymentId) : null;

  // Fetch related records
  let server: any = null;
  let deployment: any = null;
  if (serverId) {
    const [s] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
    server = s ?? null;
  }
  if (deploymentId) {
    const [d] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId)).limit(1);
    deployment = d ?? null;
  }

  // Build context block from actual data
  const ctxLines: string[] = [];
  if (server) {
    ctxLines.push(`Server Name: ${server.name}`);
    if (server.clientName) ctxLines.push(`Client: ${server.clientName}`);
    ctxLines.push(`Host / IP: ${server.host}`);
    ctxLines.push(`OS: ${server.os}${server.osVersion ? " " + server.osVersion : ""}`);
    ctxLines.push(`SSH Port: ${server.sshPort ?? 22}  Username: ${server.sshUsername ?? "root"}`);
    ctxLines.push(`Status: ${server.status}`);
    if (server.cpuUsage != null) ctxLines.push(`CPU Usage: ${server.cpuUsage}%`);
    if (server.memUsage != null) ctxLines.push(`Memory Usage: ${server.memUsage}%`);
    if (server.diskUsage != null) ctxLines.push(`Disk Usage: ${server.diskUsage}%`);
    if (server.description) ctxLines.push(`Description: ${server.description}`);
    if (server.tags?.length) ctxLines.push(`Tags: ${(server.tags as string[]).join(", ")}`);
    if (server.lastSeen) ctxLines.push(`Last Seen: ${new Date(server.lastSeen).toLocaleString()}`);
  }
  if (deployment) {
    ctxLines.push(`Related Deployment: ${(deployment as any).name ?? deployment.id}`);
    if ((deployment as any).status) ctxLines.push(`Deployment Status: ${(deployment as any).status}`);
  }
  if (!ctxLines.length) {
    ctxLines.push("No specific server context provided — write for a general Linux infrastructure environment.");
  }

  const contextBlock = `\nInfrastructure context:\n${ctxLines.map(l => `- ${l}`).join("\n")}`;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const period = dateFrom || dateTo ? `\nPeriod: ${dateFrom ?? "all time"} to ${dateTo ?? "present"}` : "";

  const promptFn = REPORT_PROMPTS[type];
  let content = "";
  if (promptFn) {
    try {
      const aiPrompt = promptFn(title, contextBlock, period, today);
      content = await claudeGenerate(aiPrompt);
    } catch (err: any) {
      console.error(`[reports] AI generation failed for type=${type}:`, err?.message ?? err);
      content = `# ${title}\n\n*Report generation failed. Please try again.*\n\n${contextBlock}`;
    }
  } else {
    content = `# ${title}\n\nReport type: ${type}`;
  }

  // Use first 3 lines as summary
  const summary = content.split("\n").filter(l => l.trim()).slice(0, 3).join(" ").slice(0, 300);

  const [report] = await db.insert(reportsTable).values({
    orgId,
    type,
    title,
    summary,
    data: JSON.stringify({ generated: new Date(), content, filters: { dateFrom, dateTo, serverId, deploymentId } }),
  }).returning();
  if (!report) { res.status(500).json({ error: "Failed" }); return; }
  res.status(201).json({ ...report, data: JSON.parse(report.data) });
});

router.delete("/organizations/:orgId/reports/:reportId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const reportId = parseInt(req.params["reportId"] ?? "0");
  await db.delete(reportsTable).where(and(eq(reportsTable.id, reportId), eq(reportsTable.orgId, orgId)));
  res.status(204).end();
});

export default router;
