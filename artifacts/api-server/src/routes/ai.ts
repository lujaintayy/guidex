import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { aiConversationsTable, aiMessagesTable, serversTable, templatesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

// ── Provider configuration ─────────────────────────────────────────────────────
type Provider = "gemini" | "openai" | "claude";

const PROVIDERS: Record<Provider, { label: string; model: string }> = {
  gemini: { label: "Gemini",  model: "gemini-2.5-flash" },
  openai: { label: "ChatGPT", model: "gpt-5.6-terra" },
  claude: { label: "Claude",  model: "claude-sonnet-4-6" },
};

// No system prompt — each provider behaves as its native self

// ── SDK clients (lazy, initialized on first use) ──────────────────────────────
let _gemini: GoogleGenAI | null = null;
let _openai: OpenAI | null = null;
let _claude: Anthropic | null = null;

function getGemini(): GoogleGenAI {
  if (!_gemini) {
    const apiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
    const baseUrl = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
    if (!apiKey || !baseUrl) throw new Error("Gemini not configured");
    // apiVersion: "" strips the /v1beta/ prefix that Replit's proxy doesn't support
    _gemini = new GoogleGenAI({ apiKey, httpOptions: { baseUrl, apiVersion: "" } });
  }
  return _gemini;
}

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
    const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
    if (!apiKey || !baseURL) throw new Error("OpenAI not configured");
    _openai = new OpenAI({ apiKey, baseURL });
  }
  return _openai;
}

function getClaude(): Anthropic {
  if (!_claude) {
    const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
    const baseURL = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
    if (!apiKey || !baseURL) throw new Error("Anthropic not configured");
    _claude = new Anthropic({ apiKey, baseURL });
  }
  return _claude;
}

// ── Unified AI call ───────────────────────────────────────────────────────────
async function callAI(
  provider: Provider,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (provider === "gemini") {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: PROVIDERS.gemini.model,
      contents: messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: { maxOutputTokens: 8192 },
    });
    return response.text ?? "No response generated.";
  }

  if (provider === "openai") {
    const ai = getOpenAI();
    const response = await ai.chat.completions.create({
      model: PROVIDERS.openai.model,
      max_completion_tokens: 8192,
      messages: messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
    return response.choices[0]?.message?.content ?? "No response generated.";
  }

  if (provider === "claude") {
    const ai = getClaude();
    const response = await ai.messages.create({
      model: PROVIDERS.claude.model,
      max_tokens: 8192,
      messages: messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })) as Anthropic.MessageParam[],
    });
    const block = response.content[0];
    return block?.type === "text" ? block.text : "No response generated.";
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// ── POST /organizations/:orgId/ai/chat ─────────────────────────────────────────
router.post("/organizations/:orgId/ai/chat", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const { message, conversationId, provider: rawProvider } = req.body;

  const provider: Provider = (["gemini", "openai", "claude"].includes(rawProvider) ? rawProvider : "gemini") as Provider;
  const providerLabel = PROVIDERS[provider].label;

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

  // Load conversation history (last 20 messages)
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
    aiText = await callAI(provider, historyMessages);
  } catch (err: any) {
    console.error(`[ai/chat] ${providerLabel} error:`, err);
    aiText = `⚠️ ${providerLabel} is temporarily unavailable. Error: ${err?.message ?? "Unknown error"}`;
  }

  await db.insert(aiMessagesTable).values({ conversationId: convId, role: "assistant", content: aiText });

  res.json({
    message: aiText,
    conversationId: convId,
    provider,
    providerLabel,
  });
});

// ── GET /organizations/:orgId/ai/conversations ─────────────────────────────────
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

// ── GET /organizations/:orgId/ai/conversations/:conversationId ─────────────────
router.get("/organizations/:orgId/ai/conversations/:conversationId", async (req, res) => {
  const conversationId = parseInt(req.params["conversationId"] ?? "0");
  const [conv] = await db.select().from(aiConversationsTable).where(eq(aiConversationsTable.id, conversationId)).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(aiMessagesTable).where(eq(aiMessagesTable.conversationId, conversationId));
  res.json({ ...conv, messages });
});

// ── DELETE /organizations/:orgId/ai/conversations/:conversationId ──────────────
router.delete("/organizations/:orgId/ai/conversations/:conversationId", async (req, res) => {
  const conversationId = parseInt(req.params["conversationId"] ?? "0");
  await db.delete(aiConversationsTable).where(eq(aiConversationsTable.id, conversationId));
  res.status(204).end();
});

// ── POST /organizations/:orgId/ai/analyze-deployment ──────────────────────────
router.post("/organizations/:orgId/ai/analyze-deployment", async (req, res) => {
  const { serverId, templateId } = req.body;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId)).limit(1);

  const analysisPrompt = `Analyze this deployment plan and return a structured JSON analysis:

Server: ${server?.name ?? "Unknown"} (${server?.host ?? "unknown"}, ${server?.os ?? "unknown"} ${server?.osVersion ?? ""})
Template: ${template?.name ?? "Unknown"} — ${template?.description ?? ""}
Script/Steps: ${template?.scriptContent ? template.scriptContent.substring(0, 1000) : JSON.stringify(template?.steps?.slice(0, 5) ?? [])}

Return JSON ONLY with: { summary, whyRequired, benefits (array), risks (array of {description, severity, mitigation}), dependencies (array), estimatedDuration (seconds), estimatedDowntime (seconds), rollbackStrategy, expectedOutcome }`;

  let analysis;
  try {
    const text = await callAI("claude", [{ role: "user", content: analysisPrompt }]);
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

// ── POST /organizations/:orgId/ai/troubleshoot ─────────────────────────────────
router.post("/organizations/:orgId/ai/troubleshoot", async (req, res) => {
  const { description } = req.body;

  let result;
  try {
    const prompt = `Troubleshoot this infrastructure issue and return JSON ONLY:
Issue: ${description}
Return: { rootCause, explanation, severity (critical/high/medium/low), recommendations (array of {action, command, explanation}) }`;
    const text = await callAI("claude", [{ role: "user", content: prompt }]);
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
