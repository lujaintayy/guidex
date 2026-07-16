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
    description: req.body.description,
    category: req.body.category,
    software: req.body.software,
    version: req.body.version,
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

export default router;
