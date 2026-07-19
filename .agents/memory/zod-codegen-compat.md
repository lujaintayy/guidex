---
name: Zod v3 generated schemas
description: orval codegen uses zod v4 API (looseObject) but project is on zod v3
---

## The rule
After running `pnpm run --filter @workspace/api-spec codegen`, the generated `lib/api-zod/src/generated/api.ts` will contain calls to `zod.looseObject({})` which does not exist in zod v3. The API server crashes at startup with `TypeError: (void 0) is not a function`.

**Why:** orval generates zod v4-style schemas but `@workspace/db` and `@workspace/api-zod` depend on zod v3.

**Fix:** After any codegen run, patch the generated file:
```bash
sed -i 's/zod\.looseObject({/zod.object({/g' lib/api-zod/src/generated/api.ts
```

**How to apply:** Run immediately after every successful `pnpm run --filter @workspace/api-spec codegen`. Also run if the API server crashes with `looseObject` error after a spec change.
