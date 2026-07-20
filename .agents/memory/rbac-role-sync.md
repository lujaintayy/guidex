---
name: RBAC role source of truth
description: Roles live in both usersTable and orgMembersTable; auth middleware enforces from usersTable.role and must stay synced.
---
Rule: Any endpoint that changes an org member's role must also update `usersTable.role`, and member-management routes must be admin-guarded.

**Why:** Auth middleware enforces reviewer view-only access from `usersTable.role` (JWT → users lookup). Updating only `orgMembersTable` silently bypasses enforcement; an unguarded member PATCH once allowed privilege escalation to global admin.

**How to apply:** When adding/altering member add/update routes, sync both tables and check `getUser(req).role === "admin"` first. Reviewer allowlist = POST /organizations/:id/(documents|reports) + PATCH /auth/me/password only.
