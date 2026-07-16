import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, usersTable } from "@workspace/db";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

router.get("/organizations/:orgId/audit-logs", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const limit = parseInt(req.query["limit"] as string ?? "100");
  const offset = parseInt(req.query["offset"] as string ?? "0");

  let logs = await db.select({
    id: auditLogsTable.id,
    action: auditLogsTable.action,
    userId: auditLogsTable.userId,
    userName: usersTable.name,
    userEmail: usersTable.email,
    resourceType: auditLogsTable.resourceType,
    resourceId: auditLogsTable.resourceId,
    resourceName: auditLogsTable.resourceName,
    details: auditLogsTable.details,
    ipAddress: auditLogsTable.ipAddress,
    createdAt: auditLogsTable.createdAt,
  }).from(auditLogsTable)
    .innerJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(eq(auditLogsTable.orgId, orgId))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  if (req.query["action"]) logs = logs.filter(l => l.action === req.query["action"]);
  if (req.query["userId"]) logs = logs.filter(l => l.userId === parseInt(req.query["userId"] as string));

  const [total] = await db.select({ c: count() }).from(auditLogsTable).where(eq(auditLogsTable.orgId, orgId));
  res.json({ items: logs, total: total?.c ?? 0, limit, offset });
});

export default router;
