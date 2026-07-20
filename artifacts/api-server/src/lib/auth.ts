import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, orgMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const SECRET = process.env["SESSION_SECRET"] ?? "infra-copilot-secret";

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { sub: number } | null {
  try {
    return jwt.verify(token, SECRET) as { sub: number };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);
  const user = users[0];
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  // Block non-active users from protected routes
  if (user.status !== "active") {
    res.status(403).json({ error: "Account is not active", status: user.status });
    return;
  }
  // Org membership role is the source of truth (usersTable.role may be stale);
  // scope the lookup to the org in the route when present, otherwise fall back
  // to the user's global role.
  const orgIdMatch = req.path.match(/^\/organizations\/(\d+)(\/|$)/);
  let effectiveRole: string | null = user.role;
  if (orgIdMatch) {
    const routeOrgId = parseInt(orgIdMatch[1]!, 10);
    const memberships = await db
      .select({ role: orgMembersTable.role })
      .from(orgMembersTable)
      .where(and(eq(orgMembersTable.userId, user.id), eq(orgMembersTable.orgId, routeOrgId)))
      .limit(1);
    if (memberships[0]?.role) effectiveRole = memberships[0].role;
  }
  if (effectiveRole && effectiveRole !== user.role) {
    (user as { role: string | null }).role = effectiveRole as typeof user.role;
  }

  // ── Reviewer role: view-only, except generating documents and reports ──────
  // Reviewers may read everything (GET/HEAD/OPTIONS) but their only allowed
  // write operations are document generation and report generation.
  if (effectiveRole === "reviewer") {
    const method = req.method.toUpperCase();
    const isRead = method === "GET" || method === "HEAD" || method === "OPTIONS";
    const path = req.path;
    // Only exact generation endpoints (POST /organizations/:id/documents and /reports)
    // — no delete/update of documents or reports, no other writes.
    const isAllowedWrite =
      (method === "POST" && /^\/organizations\/\d+\/(documents|reports)\/?$/.test(path)) ||
      (method === "PATCH" && path === "/auth/me/password"); // own password only
    if (!isRead && !isAllowedWrite) {
      res.status(403).json({
        error: "Reviewers have view-only access. You can only generate documents and reports.",
      });
      return;
    }
  }

  (req as Request & { user: typeof user }).user = user;
  next();
}

export function getUser(req: Request) {
  return (req as Request & {
    user: {
      id: number;
      name: string;
      email: string;
      avatarUrl: string | null;
      status: string;
      role: string | null;
      createdAt: Date;
      passwordHash: string;
    };
  }).user;
}
