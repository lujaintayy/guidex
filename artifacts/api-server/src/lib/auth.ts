import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  const user = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);
  if (!user[0]) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  (req as Request & { user: typeof user[0] }).user = user[0];
  next();
}

export function getUser(req: Request) {
  return (req as Request & { user: { id: number; name: string; email: string; avatarUrl: string | null; createdAt: Date; passwordHash: string } }).user;
}
