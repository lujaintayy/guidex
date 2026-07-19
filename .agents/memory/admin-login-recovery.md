---
name: Admin login recovery
description: How password_hash gets corrupted and how seed-admin prevents it happening again
---

## The rule
After any task-agent merge, the super-admin `password_hash` column may contain the literal string `"password"` instead of a bcrypt hash. This silently breaks login.

**Why:** Task agents sometimes insert the user with a plaintext placeholder during development/testing and the merge brings that over.

**Fix applied:** `lib/api-server/src/lib/seed-admin.ts` now ALWAYS re-hashes and updates the password on every startup — not just for new users. So the next server restart self-heals.

**Emergency fix (no restart):**
```bash
node /tmp/fix-pw.cjs   # uses bcryptjs@3.0.3 and pg@8.22.0 from pnpm store
```
The script is at `/tmp/fix-pw.cjs` (ephemeral — recreate if needed):
```js
const bcrypt = require("/home/runner/workspace/node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js");
const { Client } = require("/home/runner/workspace/node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/index.js");
// ... hash BOOTSTRAP_ADMIN_PASSWORD and UPDATE users SET password_hash=$1 WHERE email=...
```

**How to apply:** Whenever login fails for the bootstrap admin and DB shows `password_hash = 'password'`, restart the API server — seed will fix it.
