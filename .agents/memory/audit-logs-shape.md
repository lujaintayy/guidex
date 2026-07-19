---
name: Audit logs API shape
description: Audit logs endpoint returns paginated object, not plain array
---

## The rule
`GET /api/organizations/:orgId/audit-logs` returns `{ items: AuditLog[], total: number }`, NOT a plain array.

**Why:** The route uses offset pagination.

**How to apply:** In the frontend, always unwrap:
```ts
const allLogs = (Array.isArray(raw) ? raw : (raw as any)?.items ?? []) as AuditLog[];
```
This pattern is defensive — works regardless of whether the shape is fixed in future.
