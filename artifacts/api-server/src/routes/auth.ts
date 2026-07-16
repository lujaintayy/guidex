import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, orgMembersTable, organizationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signToken, authMiddleware, getUser } from "../lib/auth";
import { sendVerificationCode, sendAdminNewUserAlert, sendApprovalResult } from "../lib/email";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// ── POST /auth/register ────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: "Name must be at least 2 characters" });
    return;
  }
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing[0]) {
    // If already pending_verification, re-send OTP
    if (existing[0].status !== "pending_verification") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    // Re-send a fresh OTP
    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await db
      .update(usersTable)
      .set({ emailVerificationCode: codeHash, emailVerificationExpiry: expiry })
      .where(eq(usersTable.id, existing[0].id));
    await sendVerificationCode(email, code);
    res.json({ message: "Verification code resent", email: email.toLowerCase() });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      status: "pending_verification",
      emailVerificationCode: codeHash,
      emailVerificationExpiry: expiry,
    })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  await sendVerificationCode(email, code);
  res.status(201).json({ message: "Verification code sent", email: email.toLowerCase() });
});

// ── POST /auth/verify-email ────────────────────────────────────────────────────
router.post("/auth/verify-email", async (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email || !code) {
    res.status(400).json({ error: "Email and code are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  if (user.status !== "pending_verification") {
    res.status(400).json({ error: "This account does not need verification" });
    return;
  }
  if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
    res.status(400).json({ error: "No verification code found — please register again" });
    return;
  }
  if (new Date() > user.emailVerificationExpiry) {
    res.status(400).json({ error: "Verification code has expired — please register again to get a new code" });
    return;
  }
  if (hashOtp(code.trim()) !== user.emailVerificationCode) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  // Mark as pending_approval, clear OTP fields
  await db
    .update(usersTable)
    .set({
      status: "pending_approval",
      emailVerificationCode: null,
      emailVerificationExpiry: null,
    })
    .where(eq(usersTable.id, user.id));

  // Notify the super-admin only when an explicit admin email is configured
  const adminEmail = process.env["BOOTSTRAP_ADMIN_EMAIL"];
  if (adminEmail) {
    await sendAdminNewUserAlert(adminEmail, { name: user.name, email: user.email });
  } else {
    console.warn("[auth] BOOTSTRAP_ADMIN_EMAIL not set — skipping new-user admin notification");
  }

  res.json({ status: "pending_approval", message: "Email verified. Awaiting admin approval." });
});

// ── POST /auth/login ───────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.status === "pending_verification") {
    res.status(403).json({ error: "Please verify your email first", status: user.status });
    return;
  }
  if (user.status === "pending_approval") {
    res.status(403).json({ error: "Your account is awaiting admin approval", status: user.status });
    return;
  }
  if (user.status === "declined") {
    res.status(403).json({ error: "Your account request has been declined", status: user.status });
    return;
  }

  const token = signToken(user.id);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
    token,
  });
});

// ── POST /auth/logout ──────────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

// ── GET /auth/me ───────────────────────────────────────────────────────────────
router.get("/auth/me", authMiddleware, (req, res) => {
  const user = getUser(req);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  });
});

// ── PATCH /auth/me/password ────────────────────────────────────────────────────
router.patch("/auth/me/password", authMiddleware, async (req, res) => {
  const user = getUser(req);
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password incorrect" });
    return;
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password changed" });
});

// ── GET /auth/pending-users (admin only) ──────────────────────────────────────
router.get("/auth/pending-users", authMiddleware, async (req, res) => {
  const me = getUser(req);
  if (me.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const pending = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.status, "pending_approval"));

  res.json(pending);
});

// ── POST /auth/approve (admin only) ──────────────────────────────────────────
router.post("/auth/approve", authMiddleware, async (req, res) => {
  const me = getUser(req);
  if (me.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { userId, role } = req.body as { userId?: number; role?: string };
  if (!userId || !["engineer", "reviewer", "admin"].includes(role ?? "")) {
    res.status(400).json({ error: "userId and a valid role (engineer/reviewer/admin) are required" });
    return;
  }

  const validRole = role as "engineer" | "reviewer" | "admin";

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.status, "pending_approval")))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Pending user not found" });
    return;
  }

  // Update user status and role
  await db
    .update(usersTable)
    .set({ status: "active", role: validRole })
    .where(eq(usersTable.id, userId));

  // Add to the primary org (orgId 1)
  const [org] = await db.select({ id: organizationsTable.id }).from(organizationsTable).limit(1);
  if (org) {
    await db
      .insert(orgMembersTable)
      .values({ orgId: org.id, userId, role: validRole })
      .onConflictDoNothing();
  }

  // Notify user
  await sendApprovalResult(user.email, true, validRole);

  res.json({ message: "User approved", userId, role: validRole });
});

// ── POST /auth/decline (admin only) ──────────────────────────────────────────
router.post("/auth/decline", authMiddleware, async (req, res) => {
  const me = getUser(req);
  if (me.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { userId } = req.body as { userId?: number };
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.status, "pending_approval")))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Pending user not found" });
    return;
  }

  await db.update(usersTable).set({ status: "declined" }).where(eq(usersTable.id, userId));
  await sendApprovalResult(user.email, false);

  res.json({ message: "User declined", userId });
});

export default router;
