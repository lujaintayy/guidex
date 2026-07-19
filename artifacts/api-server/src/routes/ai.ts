import { Router } from "express";
import { db } from "@workspace/db";
import { aiConversationsTable, aiMessagesTable, serversTable, templatesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

// ── Agent personas ─────────────────────────────────────────────────────────────
const AGENT_PERSONAS: Record<string, { name: string; systemPrompt: string }> = {
  copilot: {
    name: "Infrastructure Copilot",
    systemPrompt: `You are GuideX Infrastructure Copilot — a senior DevOps and Linux infrastructure engineer with 15+ years of experience. You provide precise, practical guidance on server administration, deployments, configuration management, and infrastructure best practices.

Always:
- Include concrete bash commands with brief explanations
- Mention risks or caveats when relevant
- Structure responses with clear headings when the answer is long
- Suggest verification steps after changes
Be thorough but concise. Never fabricate command outputs.`,
  },
  security: {
    name: "Security Analyst",
    systemPrompt: `You are GuideX Security Analyst — an infrastructure security specialist. You focus on hardening servers, auditing configurations, fixing CVEs, managing firewalls, TLS/SSL, and compliance (CIS benchmarks, SOC2, ISO27001).

Always:
- Explain the risk before the fix
- Provide hardening commands with expected outcomes
- Flag any actions that could lock out access
Never suggest disabling security controls without alternatives.`,
  },
  deployment: {
    name: "Deployment Specialist",
    systemPrompt: `You are GuideX Deployment Specialist — an expert in CI/CD pipelines, deployment strategies, Docker, Kubernetes, and release engineering. You help design zero-downtime deployments, rollback strategies, and service configuration management.

Always provide:
- Clear step-by-step deployment procedures
- Rollback commands alongside deployment commands
- Health check verification steps`,
  },
  troubleshooter: {
    name: "Troubleshooter",
    systemPrompt: `You are GuideX Troubleshooter — a systematic diagnostic expert for infrastructure incidents. Use root-cause analysis methodology.

Always start with:
1. Log analysis commands for the specific issue
2. Resource utilization checks
3. Service and network status verification
Then provide targeted fixes based on findings. Ask clarifying questions if the issue description is vague.`,
  },
  database: {
    name: "Database Administrator",
    systemPrompt: `You are GuideX Database Administrator — a specialist in PostgreSQL, MySQL, Redis, and MongoDB administration. You handle query optimization, backup strategies, replication, and performance tuning.

Always include:
- Safe commands that won't disrupt active connections
- Backup steps before any schema changes
- Performance impact notes`,
  },
};

// ── Gemini API helper ──────────────────────────────────────────────────────────
async function callGemini(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  const baseUrl = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];

  if (!baseUrl || !apiKey) {
    throw new Error("Gemini AI service not configured");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "I could not generate a response. Please try again.";
}

// ── POST /organizations/:orgId/ai/chat ─────────────────────────────────────────
router.post("/organizations/:orgId/ai/chat", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const { message, conversationId, agentId } = req.body;

  const persona = AGENT_PERSONAS[agentId as string] ?? AGENT_PERSONAS["copilot"]!;

  // Upsert conversation
  let convId = conversationId;
  if (!convId) {
    const title = message.length > 60 ? message.substring(0, 60) + "…" : message;
    const [conv] = await db.insert(aiConversationsTable).values({
      orgId, userId: user.id, title, lastMessageAt: new Date(),
    }).returning();
    convId = conv?.id;
  } else {
    await db.update(aiConversationsTable).set({ lastMessageAt: new Date() }).where(eq(aiConversationsTable.id, convId));
  }

  // Save user message
  await db.insert(aiMessagesTable).values({ conversationId: convId, role: "user", content: message });

  // Load conversation history for context (last 20 messages)
  const history = await db
    .select({ role: aiMessagesTable.role, content: aiMessagesTable.content })
    .from(aiMessagesTable)
    .where(eq(aiMessagesTable.conversationId, convId))
    .orderBy(desc(aiMessagesTable.id))
    .limit(20);

  const historyMessages = history.reverse().map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  let aiText: string;
  try {
    aiText = await callGemini(historyMessages, persona.systemPrompt);
  } catch (err: any) {
    console.error("[ai/chat] Gemini error:", err);
    aiText = `⚠️ AI service temporarily unavailable. Error: ${err?.message ?? "Unknown error"}`;
  }

  await db.insert(aiMessagesTable).values({ conversationId: convId, role: "assistant", content: aiText });

  res.json({
    message: aiText,
    conversationId: convId,
    agentId: agentId ?? "copilot",
    agentName: persona.name,
  });
});

router.get("/organizations/:orgId/ai/conversations", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const convs = await db.select().from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.orgId, orgId), eq(aiConversationsTable.userId, user.id)))
    .orderBy(desc(aiConversationsTable.lastMessageAt));
  const result = await Promise.all(convs.map(async (c) => {
    const msgs = await db.select().from(aiMessagesTable).where(eq(aiMessagesTable.conversationId, c.id));
    return { ...c, messageCount: msgs.length };
  }));
  res.json(result);
});

router.get("/organizations/:orgId/ai/conversations/:conversationId", async (req, res) => {
  const conversationId = parseInt(req.params["conversationId"] ?? "0");
  const [conv] = await db.select().from(aiConversationsTable).where(eq(aiConversationsTable.id, conversationId)).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(aiMessagesTable).where(eq(aiMessagesTable.conversationId, conversationId));
  res.json({ ...conv, messages });
});

router.delete("/organizations/:orgId/ai/conversations/:conversationId", async (req, res) => {
  const conversationId = parseInt(req.params["conversationId"] ?? "0");
  await db.delete(aiConversationsTable).where(eq(aiConversationsTable.id, conversationId));
  res.status(204).end();
});

router.post("/organizations/:orgId/ai/analyze-deployment", async (req, res) => {
  const { serverId, templateId } = req.body;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId)).limit(1);

  const systemPrompt = AGENT_PERSONAS["deployment"]!.systemPrompt;
  const analysisPrompt = `Analyze this deployment plan and return a structured JSON analysis:

Server: ${server?.name ?? "Unknown"} (${server?.host ?? "unknown"}, ${server?.os ?? "unknown"} ${server?.osVersion ?? ""})
Template: ${template?.name ?? "Unknown"} — ${template?.description ?? ""}
Script/Steps: ${template?.scriptContent ? template.scriptContent.substring(0, 1000) : JSON.stringify(template?.steps?.slice(0, 5) ?? [])}

Return JSON with: { summary, whyRequired, benefits (array), risks (array of {description, severity, mitigation}), dependencies (array), estimatedDuration (seconds), estimatedDowntime (seconds), rollbackStrategy, expectedOutcome }`;

  let analysis;
  try {
    const text = await callGemini([{ role: "user", content: analysisPrompt }], systemPrompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { analysis = JSON.parse(cleaned); } catch { analysis = null; }
  } catch { analysis = null; }

  if (!analysis) {
    analysis = {
      summary: `Deploy ${template?.name ?? "software"} on ${server?.name ?? "target server"}`,
      whyRequired: "Required to provision the requested software component.",
      benefits: ["Automated with rollback support", "Pre-validated steps", "Fully audited"],
      risks: [{ description: "Brief service interruption during installation", severity: "low", mitigation: "Schedule during off-peak hours" }],
      dependencies: ["Package repositories accessible", "Sufficient disk space", "Required ports open"],
      estimatedDuration: 300,
      estimatedDowntime: 30,
      rollbackStrategy: "Restore from pre-deployment snapshot.",
      expectedOutcome: "Software installed, service running, and health checks passing.",
    };
  }

  res.json({
    ...analysis,
    steps: (template?.steps ?? []).map((s: any) => ({
      order: s.order,
      name: s.name,
      description: s.description ?? "",
      command: s.command,
      estimatedSeconds: s.estimatedSeconds ?? 30,
      rollbackCommand: "",
    })),
  });
});

router.post("/organizations/:orgId/ai/troubleshoot", async (req, res) => {
  const { description } = req.body;
  const systemPrompt = AGENT_PERSONAS["troubleshooter"]!.systemPrompt;

  let result;
  try {
    const prompt = `Troubleshoot this infrastructure issue and return JSON: ${description}
Return: { rootCause, explanation, severity (critical/high/medium/low), recommendations (array of {action, command, explanation}) }`;
    const text = await callGemini([{ role: "user", content: prompt }], systemPrompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { result = JSON.parse(cleaned); } catch { result = null; }
  } catch { result = null; }

  if (!result) {
    result = {
      rootCause: "Requires further investigation",
      explanation: `Based on: "${description}" — this needs log analysis and service status verification.`,
      severity: "medium",
      recommendations: [
        { action: "Check system logs", command: "journalctl -xe --no-pager -n 200", explanation: "Review recent system events" },
        { action: "Check disk space", command: "df -h", explanation: "Disk exhaustion causes many failures" },
        { action: "Check memory", command: "free -m && ps aux --sort=-%mem | head -10", explanation: "Memory pressure can cause OOM kills" },
      ],
    };
  }

  res.json(result);
});

export default router;
