import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware, getUser } from "../lib/auth";
import { RegisterBody, LoginBody, ChangePasswordBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { name, email, password } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash }).returning();
  if (!user) {
    res.status(500).json({ error: "Failed to create user" });
    return;
  }
  const token = signToken(user.id);
  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken(user.id);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", authMiddleware, (req, res) => {
  const user = getUser(req);
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt });
});

router.patch("/auth/me/password", authMiddleware, async (req, res) => {
  const user = getUser(req);
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password incorrect" });
    return;
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password changed" });
});

export default router;
