/**
 * Seed the super-admin account on startup.
 *
 * Reads configuration from environment variables — no credentials are
 * hardcoded in this file. The seed is a no-op when the required env vars
 * are absent, making it safe in all environments.
 *
 * Required env vars:
 *   BOOTSTRAP_ADMIN_EMAIL    e.g. lujain.tayyarah@cyberx.world
 *   BOOTSTRAP_ADMIN_PASSWORD strong initial password for the account
 *
 * Optional:
 *   BOOTSTRAP_ADMIN_NAME     display name  (default: "Super Admin")
 *   BOOTSTRAP_ORG_NAME       org name      (default: "My Organisation")
 */
import { db } from "@workspace/db";
import { usersTable, organizationsTable, orgMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedSuperAdmin() {
  const email    = process.env["BOOTSTRAP_ADMIN_EMAIL"];
  const password = process.env["BOOTSTRAP_ADMIN_PASSWORD"];

  if (!email || !password) {
    // Silently skip — required vars not configured in this environment
    return;
  }

  const name    = process.env["BOOTSTRAP_ADMIN_NAME"]    ?? "Super Admin";
  const orgName = process.env["BOOTSTRAP_ORG_NAME"]      ?? "My Organisation";

  try {
    // 1. User — create only if the email does not exist yet --------------------
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    let userId: number;
    if (existing) {
      // Ensure the existing super-admin is always active with admin role
      await db
        .update(usersTable)
        .set({ status: "active", role: "admin" })
        .where(eq(usersTable.id, existing.id));
      userId = existing.id;
    } else {
      const hash = bcrypt.hashSync(password, 10);
      const [newUser] = await db
        .insert(usersTable)
        .values({ name, email, passwordHash: hash, status: "active", role: "admin" })
        .returning({ id: usersTable.id });
      if (!newUser) throw new Error("Failed to insert bootstrap admin user");
      userId = newUser.id;
    }

    // 2. Organisation — create only if it does not exist yet ------------------
    const [existingOrg] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.name, orgName))
      .limit(1);

    let orgId: number;
    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const [newOrg] = await db
        .insert(organizationsTable)
        .values({ name: orgName, description: "Bootstrap organisation" })
        .returning({ id: organizationsTable.id });
      if (!newOrg) throw new Error("Failed to insert bootstrap org");
      orgId = newOrg.id;
    }

    // 3. Org membership -------------------------------------------------------
    await db
      .insert(orgMembersTable)
      .values({ orgId, userId, role: "admin" })
      .onConflictDoNothing();

    console.log(`[seed] Bootstrap admin seeded (userId=${userId}, orgId=${orgId})`);
  } catch (err) {
    // Log but never crash the server — seed failure is non-fatal
    console.error("[seed] Bootstrap admin seed failed:", err);
  }
}
