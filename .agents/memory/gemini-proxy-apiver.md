---
name: Gemini proxy apiVersion fix
description: Replit's AI Integrations Gemini proxy rejects the SDK's default /v1beta/ path — must set apiVersion to empty string.
---

## Rule

When initializing `GoogleGenAI` with the Replit AI Integrations proxy base URL, always pass `apiVersion: ""` in `httpOptions`:

```typescript
new GoogleGenAI({
  apiKey: process.env["AI_INTEGRATIONS_GEMINI_API_KEY"],
  httpOptions: {
    baseUrl: process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"],
    apiVersion: "",   // ← required — strips /v1beta/ prefix
  },
});
```

**Why:** The `@google/genai` SDK defaults to `/v1beta/` as the API version prefix. Replit's proxy does not route that path and returns `INVALID_ENDPOINT 400`. Setting `apiVersion: ""` removes the prefix entirely, making calls hit the proxy's expected path. This matches exactly what `.local/skills/ai-integrations-gemini/templates/lib/integrations-gemini-ai/src/client.ts` does.

**How to apply:** Any direct instantiation of `GoogleGenAI` using `AI_INTEGRATIONS_GEMINI_BASE_URL` must include this option. Also applies to the templates `/analyze` endpoint and any future Gemini calls added to the project.
