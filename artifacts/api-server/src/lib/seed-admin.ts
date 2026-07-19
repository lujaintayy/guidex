/**
 * Seed the super-admin account on startup.
 * ALWAYS re-hashes and updates the password so a stale/corrupt hash can never
 * silently block login. Status and role are also enforced to active/admin.
 */
import { db } from "@workspace/db";
import { usersTable, organizationsTable, orgMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedSuperAdmin() {
  const email    = process.env["BOOTSTRAP_ADMIN_EMAIL"];
  const password = process.env["BOOTSTRAP_ADMIN_PASSWORD"];
  if (!email || !password) return; // vars absent — safe no-op in all environments

  const name    = process.env["BOOTSTRAP_ADMIN_NAME"]  ?? "Super Admin";
  const orgName = process.env["BOOTSTRAP_ORG_NAME"]    ?? "My Organisation";

  try {
    const hash = bcrypt.hashSync(password, 10);

    // ── User ──────────────────────────────────────────────────────────────────
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email)).limit(1);

    let userId: number;
    if (existing) {
      // Always sync password hash, status, and role so corruption can't persist
      await db.update(usersTable)
        .set({ passwordHash: hash, status: "active", role: "admin" })
        .where(eq(usersTable.id, existing.id));
      userId = existing.id;
    } else {
      const [u] = await db.insert(usersTable)
        .values({ name, email, passwordHash: hash, status: "active", role: "admin" })
        .returning({ id: usersTable.id });
      if (!u) throw new Error("Failed to insert bootstrap admin user");
      userId = u.id;
    }

    // ── Organisation ─────────────────────────────────────────────────────────
    const [existingOrg] = await db.select({ id: organizationsTable.id })
      .from(organizationsTable).where(eq(organizationsTable.name, orgName)).limit(1);

    let orgId: number;
    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const [o] = await db.insert(organizationsTable)
        .values({ name: orgName, description: "Bootstrap organisation" })
        .returning({ id: organizationsTable.id });
      if (!o) throw new Error("Failed to insert bootstrap org");
      orgId = o.id;
    }

    // ── Membership ────────────────────────────────────────────────────────────
    await db.insert(orgMembersTable)
      .values({ orgId, userId, role: "admin" })
      .onConflictDoNothing();

    console.log(`[seed] Super-admin seeded (userId=${userId}, orgId=${orgId})`);
  } catch (err) {
    console.error("[seed] Bootstrap seed failed:", err);
  }
}
