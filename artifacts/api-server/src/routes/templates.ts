import { Router } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db";
import { eq, and, or, isNull } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

router.get("/organizations/:orgId/templates", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  let templates = await db.select().from(templatesTable).where(
    or(eq(templatesTable.orgId, orgId), isNull(templatesTable.orgId), eq(templatesTable.isBuiltIn, true))
  );
  if (req.query["category"]) {
    templates = templates.filter(t => t.category === req.query["category"]);
  }
  res.json(templates);
});

router.post("/organizations/:orgId/templates", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const [template] = await db.insert(templatesTable).values({
    orgId,
    name: req.body.name,
    description: req.body.description ?? null,
    scriptContent: req.body.scriptContent ?? null,
    category: req.body.category ?? "other",
    software: req.body.software ?? "",
    version: req.body.version ?? "1.0.0",
    osRequirements: req.body.osRequirements ?? [],
    steps: req.body.steps ?? [],
    configValues: req.body.configValues ?? {},
    envVars: req.body.envVars ?? {},
    postInstallActions: req.body.postInstallActions ?? [],
    isBuiltIn: false,
  }).returning();
  if (!template) { res.status(500).json({ error: "Failed" }); return; }
  res.status(201).json(template);
});

router.get("/organizations/:orgId/templates/:templateId", async (req, res) => {
  const templateId = parseInt(req.params["templateId"] ?? "0");
  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId)).limit(1);
  if (!template) { res.status(404).json({ error: "Not found" }); return; }
  res.json(template);
});

router.patch("/organizations/:orgId/templates/:templateId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const templateId = parseInt(req.params["templateId"] ?? "0");
  const [template] = await db.update(templatesTable).set({
    name: req.body.name,
    description: req.body.description,
    scriptContent: req.body.scriptContent,
    software: req.body.software,
    version: req.body.version,
    steps: req.body.steps,
    configValues: req.body.configValues,
    envVars: req.body.envVars,
    postInstallActions: req.body.postInstallActions,
  }).where(and(eq(templatesTable.id, templateId), eq(templatesTable.orgId, orgId))).returning();
  if (!template) { res.status(404).json({ error: "Not found" }); return; }
  res.json(template);
});

router.delete("/organizations/:orgId/templates/:templateId", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const templateId = parseInt(req.params["templateId"] ?? "0");
  await db.delete(templatesTable).where(and(eq(templatesTable.id, templateId), eq(templatesTable.orgId, orgId)));
  res.status(204).end();
});

// AI analysis of script content
// Kept for backward-compat — analyzes a script and returns metadata
router.post("/organizations/:orgId/templates/analyze", async (req, res) => {
  const { scriptContent } = req.body;
  if (!scriptContent || typeof scriptContent !== "string") {
    res.status(400).json({ error: "scriptContent is required" });
    return;
  }

  const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
  const baseURL = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
  if (!apiKey || !baseURL) { res.status(503).json({ error: "AI service not configured" }); return; }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const claude = new Anthropic({ apiKey, baseURL });
    const prompt = `Analyze this shell/bash script and return ONLY valid JSON (no markdown, no code fences) with these fields:
{"software":"the main software package being installed or configured","description":"one sentence describing what this script does","name":"a concise template name"}
Script:\n${scriptContent.substring(0, 3000)}`;
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "{}";
    let result: any;
    try { result = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); }
    catch { result = { software: "", description: "Script analysis failed", name: "" }; }
    res.json(result);
  } catch (err: any) {
    console.error("[templates/analyze]", err);
    res.status(500).json({ error: err?.message ?? "Analysis failed" });
  }
});

// Generate a bash script from name + software + description requirements
router.post("/organizations/:orgId/templates/generate-script", async (req, res) => {
  const { name, software, description } = req.body;
  if (!name || !software || !description) {
    res.status(400).json({ error: "name, software, and description are required" });
    return;
  }

  const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
  const baseURL = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
  if (!apiKey || !baseURL) { res.status(503).json({ error: "AI service not configured" }); return; }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const claude = new Anthropic({ apiKey, baseURL });

    const prompt = `Write a production-quality bash installation/configuration script based on these requirements:

Template Name: ${name}
Software Package: ${software}
Description / Requirements: ${description}

Requirements for the script:
- Start with #!/bin/bash and set -euo pipefail
- Include a clear header comment block with the template name, software, and description
- Support Ubuntu/Debian (use apt-get) as primary, with CentOS/RHEL fallback if relevant
- Run non-interactive (use DEBIAN_FRONTEND=noninteractive, -y flags, etc.)
- Include proper error handling and informational echo statements at each major step
- Add any required service enablement and startup (systemctl enable + start)
- Include basic validation/health checks at the end (e.g. verify service is running, version check)
- Add configuration steps appropriate for the software (e.g. firewall rules, default config, security hardening)
- Comment each major section clearly
- Follow the user's description EXACTLY — every requirement they mention must be implemented in the script
- Do NOT use placeholder values — write real, runnable commands

Return ONLY the bash script with no explanation, no markdown code fences, no preamble.`;

    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: "You are a senior Linux systems engineer who writes precise, production-ready bash scripts. You implement every requirement the user specifies, exactly as described.",
      messages: [{ role: "user", content: prompt }],
    });

    let script = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();
    // Strip markdown fences if the model added them
    script = script.replace(/^```(?:bash|sh)?\n?/i, "").replace(/\n?```$/i, "").trim();

    res.json({ script });
  } catch (err: any) {
    console.error("[templates/generate-script]", err);
    res.status(500).json({ error: err?.message ?? "Script generation failed" });
  }
});

export default router;
