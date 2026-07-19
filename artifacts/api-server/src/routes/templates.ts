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
router.post("/organizations/:orgId/templates/analyze", async (req, res) => {
  const { scriptContent } = req.body;
  if (!scriptContent || typeof scriptContent !== "string") {
    res.status(400).json({ error: "scriptContent is required" });
    return;
  }

  const baseUrl = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];

  if (!baseUrl || !apiKey) {
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: "You are an infrastructure engineer. Analyze shell/bash scripts and return structured information.",
          },
          {
            role: "user",
            content: `Analyze this script and return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "software": "the main software package being installed or configured (e.g. nginx, docker, postgresql)",
  "description": "one sentence describing what this script does",
  "name": "a concise template name (e.g. 'Nginx with SSL Setup')"
}

Script:
${scriptContent.substring(0, 3000)}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json() as any;
    const text = (data.choices?.[0]?.message?.content ?? "{}") as string;

    let result: { software: string; description: string; name: string };
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { software: "", description: "Script analysis failed", name: "" };
    }

    res.json(result);
  } catch (err: any) {
    console.error("[templates/analyze]", err);
    res.status(500).json({ error: err?.message ?? "Analysis failed" });
  }
});

export default router;
