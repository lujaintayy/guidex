import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

router.get("/notifications", async (req, res) => {
  const user = getUser(req);
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(notificationsTable.createdAt);
  res.json(notifications);
});

router.patch("/notifications/:notificationId/read", async (req, res) => {
  const user = getUser(req);
  const notificationId = parseInt(req.params["notificationId"] ?? "0");
  const [n] = await db.update(notificationsTable).set({ read: true })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, user.id)))
    .returning();
  if (!n) { res.status(404).json({ error: "Not found" }); return; }
  res.json(n);
});

router.post("/notifications/read-all", async (req, res) => {
  const user = getUser(req);
  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, user.id));
  res.json({ message: "All marked read" });
});

export default router;
