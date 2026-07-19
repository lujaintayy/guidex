import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, reportsTable, serversTable, deploymentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { GoogleGenAI } from "@google/genai";

let _gemini: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!_gemini) {
    const apiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
    const baseUrl = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
    if (!apiKey || !baseUrl) throw new Error("Gemini not configured");
    _gemini = new GoogleGenAI({ apiKey, httpOptions: { baseUrl, apiVersion: "" } });
  }
  return _gemini;
}

const router = Router();
router.use(authMiddleware);

// Document templates — produce placeholder-rich markdown the user fills in
const DOC_TEMPLATES: Record<string, (title: string, context?: any) => string> = {
  deployment_report: (title, ctx) => `# Deployment Report: ${title}

**Date:** ${new Date().toLocaleDateString()}
**Server:** ${ctx?.serverName ?? "[SERVER NAME]"}
**Deployment:** ${ctx?.deploymentName ?? "[DEPLOYMENT NAME]"}
**Engineer:** [YOUR NAME]

---

## Summary

[Describe the deployment outcome — success/failure, key changes made]

## Steps Executed

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1 | Pre-flight check | [PASS/FAIL] | [notes] |
| 2 | Package installation | [PASS/FAIL] | [notes] |
| 3 | Configuration | [PASS/FAIL] | [notes] |
| 4 | Service startup | [PASS/FAIL] | [notes] |
| 5 | Health verification | [PASS/FAIL] | [notes] |

## Metrics

- **Duration:** [X minutes Y seconds]
- **Downtime:** [X seconds / none]
- **Rollback required:** [Yes/No]

## Post-Deployment Verification

- Service status: [active/inactive]
- Port accessibility: [confirmed/not tested]
- Health endpoint: [responding/not available]

## Issues Encountered

[List any issues or leave "None"]

## Conclusion

[Summary of result and any follow-up actions needed]
`,

  sop: (title) => `# Standard Operating Procedure: ${title}

**Document ID:** SOP-[NUMBER]
**Version:** 1.0
**Effective Date:** ${new Date().toLocaleDateString()}
**Review Date:** [DATE + 1 YEAR]
**Owner:** [TEAM/ROLE]

---

## Purpose

[Describe the purpose of this SOP]

## Scope

[Who this applies to and what systems/environments are covered]

## Prerequisites

- [ ] [Prerequisite 1 — e.g. SSH access to target server]
- [ ] [Prerequisite 2 — e.g. Change request approved]
- [ ] [Prerequisite 3 — e.g. Backup completed]

## Procedure

### Step 1: Preparation

\`\`\`bash
# [Command to verify readiness]
[command here]
\`\`\`

**Expected output:** [Describe expected output]

### Step 2: [ACTION NAME]

\`\`\`bash
# [Command]
[command here]
\`\`\`

**Expected output:** [Describe expected output]
**If this fails:** [Describe recovery action]

### Step 3: Verification

\`\`\`bash
# Verify the operation completed successfully
[verification command]
\`\`\`

## Rollback Procedure

[Describe how to undo this operation if needed]

## Approvals

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Author | | | |
| Reviewer | | | |
| Approver | | | |
`,

  architecture_doc: (title) => `# Architecture Documentation: ${title}

**Version:** 1.0
**Date:** ${new Date().toLocaleDateString()}
**Status:** [DRAFT / APPROVED]

---

## Overview

[High-level description of the system or component]

## Architecture Diagram

\`\`\`
[Draw ASCII diagram or describe the architecture here]
Example:
Internet → Load Balancer → [App-01, App-02] → PostgreSQL
                       ↘ Redis (cache)
\`\`\`

## Components

| Component | Technology | Purpose | Hosts |
|-----------|------------|---------|-------|
| Web Tier | [e.g. Nginx] | [e.g. Reverse proxy, SSL termination] | [servers] |
| App Tier | [e.g. Node.js] | [e.g. API and business logic] | [servers] |
| Data Tier | [e.g. PostgreSQL] | [e.g. Primary data store] | [servers] |
| Cache | [e.g. Redis] | [e.g. Session & query cache] | [servers] |

## Network & Security

- **Firewall rules:** [List key inbound/outbound rules]
- **Encryption:** [TLS version, certificate authority]
- **Authentication:** [How services authenticate to each other]
- **Secrets management:** [How credentials are stored]

## Data Flow

[Describe how data flows through the system]

## Scaling Strategy

[How does the system scale — horizontal/vertical, auto-scaling triggers]

## Disaster Recovery

- **RPO (Recovery Point Objective):** [e.g. 4 hours]
- **RTO (Recovery Time Objective):** [e.g. 1 hour]
- **Backup strategy:** [Describe backup schedule and retention]
- **Failover procedure:** [Describe how to fail over]

## Known Limitations

[List any current limitations or technical debt]
`,

  troubleshooting_report: (title) => `# Troubleshooting Report: ${title}

**Incident Date:** ${new Date().toLocaleDateString()}
**Severity:** [Critical / High / Medium / Low]
**Status:** [Open / Investigating / Resolved]
**Reporter:** [YOUR NAME]
**Assigned To:** [ENGINEER NAME]

---

## Incident Summary

**What happened:** [Brief description of the issue]
**First observed:** [Time and date]
**Affected systems:** [List servers/services affected]
**Business impact:** [Describe user/business impact]

## Timeline

| Time | Event | Actor |
|------|-------|-------|
| [T+0] | [Alert triggered / Issue reported] | [System/Person] |
| [T+X] | [Action taken] | [Engineer] |
| [T+X] | [Resolution applied] | [Engineer] |
| [T+X] | [Service restored] | [System] |

## Root Cause Analysis

**Root cause:** [Describe the root cause]

**Contributing factors:**
- [Factor 1]
- [Factor 2]

## Resolution

**Steps taken:**
\`\`\`bash
# [Commands used to diagnose]
[command]

# [Commands used to fix]
[command]
\`\`\`

**Result:** [Describe outcome]

## Prevention

- [ ] [Action 1 — e.g. Add monitoring alert for X]
- [ ] [Action 2 — e.g. Update runbook with this procedure]
- [ ] [Action 3 — e.g. Implement automated remediation]
`,

  srs: (title) => `# Software Requirements Specification: ${title}

**Document Version:** 1.0
**Date:** ${new Date().toLocaleDateString()}
**Status:** [DRAFT / REVIEW / APPROVED]
**Author:** [YOUR NAME]
**Stakeholders:** [LIST STAKEHOLDERS]

---

## 1. Introduction

### 1.1 Purpose

[Describe the purpose of this SRS and the system it covers]

### 1.2 Scope

[Define the boundaries of the system — what is and is not included]

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|-----------|
| [TERM] | [Definition] |

## 2. System Overview

[High-level description of the system and its context]

## 3. Functional Requirements

### 3.1 [Feature/Module Name]

**FR-001:** [Requirement statement]
- **Priority:** [Must Have / Should Have / Nice to Have]
- **Acceptance Criteria:** [How to verify this requirement is met]

**FR-002:** [Requirement statement]
- **Priority:** [Must Have / Should Have / Nice to Have]
- **Acceptance Criteria:** [How to verify this requirement is met]

### 3.2 [Another Feature/Module]

**FR-003:** [Requirement statement]
- **Priority:** [Must Have]
- **Acceptance Criteria:** [Criteria]

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-001:** [e.g. The system shall respond to API requests within 200ms under normal load]

### 4.2 Security
- **NFR-002:** [e.g. All data at rest shall be encrypted using AES-256]

### 4.3 Availability
- **NFR-003:** [e.g. The system shall maintain 99.9% uptime]

### 4.4 Scalability
- **NFR-004:** [e.g. The system shall support N concurrent users]

## 5. System Interfaces

### 5.1 User Interfaces
[Describe UI requirements]

### 5.2 External Interfaces / APIs
[List external systems the software integrates with]

## 6. Constraints & Assumptions

**Constraints:**
- [Technical or business constraints]

**Assumptions:**
- [Assumptions made during requirements gathering]

## 7. Acceptance Criteria Summary

[Overall acceptance criteria for project completion]
`,
};

router.get("/organizations/:orgId/documents", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  let docs = await db.select().from(documentsTable).where(eq(documentsTable.orgId, orgId));
  if (req.query["type"]) docs = docs.filter(d => d.type === req.query["type"]);
  res.json(docs);
});

router.post("/organizations/:orgId/documents", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const { type, title, prompt, mode } = req.body;

  // Coerce FK fields to integer or null — never pass empty strings to integer columns
  const serverId: number | null = req.body.serverId ? parseInt(req.body.serverId) : null;
  const deploymentId: number | null = req.body.deploymentId ? parseInt(req.body.deploymentId) : null;

  // Build context from related records
  let context: any = {};
  if (serverId) {
    const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
    if (server) context.server = server;
  }
  if (deploymentId) {
    const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId)).limit(1);
    if (deployment) context.deployment = deployment;
  }

  let content: string;

  // SRS and any AI-enabled type: generate with Gemini
  if (type === "srs") {
    try {
      const ai = getGemini();
      const contextLines: string[] = [];
      if (context.server) contextLines.push(`Server: ${context.server.name} (${context.server.ip ?? "no IP"}, ${context.server.os ?? "unknown OS"})`);
      if (context.deployment) contextLines.push(`Related deployment: ${(context.deployment as any).name ?? "unnamed"}`);
      if (prompt) contextLines.push(`Additional context from user: ${prompt}`);

      const systemContext = contextLines.length
        ? `\n\nContext about the system:\n${contextLines.join("\n")}`
        : "";

      const aiPrompt = `You are a senior software engineer. Generate a complete, professional Software Requirements Specification (SRS) document for: "${title}".${systemContext}

The document must be thorough and production-ready — not a template with placeholders. Fill in every section with realistic, detailed content appropriate for an infrastructure management system. Use today's date: ${new Date().toLocaleDateString()}.

Structure the document with these sections:
1. Introduction (Purpose, Scope, Definitions & Acronyms, References)
2. Overall Description (Product Perspective, Product Functions, User Classes, Operating Environment, Constraints)
3. Functional Requirements (numbered FR-001..., with priority and acceptance criteria for each)
4. Non-Functional Requirements (Performance, Security, Availability, Scalability, Maintainability)
5. System Interfaces (User Interfaces, Software Interfaces, Hardware Interfaces, Communication Interfaces)
6. Data Requirements (Data models, Retention, Privacy)
7. Constraints & Assumptions
8. Appendix

Return only the markdown document — no preamble or explanation.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        config: { maxOutputTokens: 8192 },
      });
      content = response.text ?? "";
    } catch (err: any) {
      console.error("[documents] Gemini SRS generation failed:", err?.message ?? err);
      // Fall back to template
      content = DOC_TEMPLATES["srs"]?.(title, context) ?? `# ${title}`;
    }
  } else {
    const generator = DOC_TEMPLATES[type];
    content = generator
      ? generator(title, { serverName: context.server?.name, deploymentName: (context.deployment as any)?.name })
      : `# ${title}\n\n${prompt ?? ""}`;
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

// Reports
router.get("/organizations/:orgId/reports", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.orgId, orgId));
  res.json(reports);
});

router.post("/organizations/:orgId/reports", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const { type, title, dateFrom, dateTo, serverId, deploymentId } = req.body;

  // Build a rich summary based on context
  let contextInfo = "";
  if (serverId) {
    const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
    if (server) contextInfo = ` for server "${server.name}" (${server.host})`;
  }
  if (deploymentId) {
    const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId)).limit(1);
    if (deployment) contextInfo = ` for deployment "${(deployment as any).name}"`;
  }

  const period = dateFrom || dateTo ? ` covering ${dateFrom ?? "all time"} to ${dateTo ?? "present"}` : "";
  const summary = `${type.replace(/_/g, " ")} report generated${contextInfo}${period}.`;

  const [report] = await db.insert(reportsTable).values({
    orgId,
    type,
    title,
    summary,
    data: JSON.stringify({
      generated: new Date(),
      filters: { dateFrom, dateTo, serverId, deploymentId },
    }),
  }).returning();
  if (!report) { res.status(500).json({ error: "Failed" }); return; }
  res.status(201).json({ ...report, data: JSON.parse(report.data) });
});

export default router;
