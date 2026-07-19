# GuideX — Technical Overview

> A detailed breakdown of every component, technology, design decision, and engineering challenge behind the GuideX Infrastructure Copilot platform.

---

## 1. What Is GuideX?

GuideX is a production-ready enterprise DevOps and infrastructure management platform. It gives engineering teams a single pane of glass to:

- Register and manage remote servers via SSH
- Run and track deployments using script templates
- Monitor server health and alerts
- Chat with AI agents specialized in infrastructure, security, and databases
- Manage team membership and organizational access
- Generate documents, reports, and audit trails

---

## 2. Repository Structure

The project is a **pnpm monorepo** using workspaces. All packages live under two top-level folders:

```
workspace/
├── artifacts/
│   ├── infrastructure-copilot/   ← React + Vite frontend (the web app)
│   ├── api-server/               ← Express REST + WebSocket backend
│   └── mockup-sandbox/           ← Isolated component preview server (design tooling)
├── lib/
│   ├── db/                       ← PostgreSQL schema + Drizzle ORM migrations
│   └── api-zod/                  ← Auto-generated Zod validation schemas from OpenAPI spec
└── scripts/                      ← Utility / maintenance scripts (e.g. DB clearing)
```

Each artifact is independently deployable and communicates over HTTP/WebSocket.

---

## 3. Languages

| Layer | Language |
|---|---|
| Frontend | TypeScript (strict mode) + TSX (React) |
| Backend | TypeScript (Node.js via tsx / ts-node) |
| Database schema | TypeScript (Drizzle ORM schema definitions) |
| Styles | Tailwind CSS utility classes (no custom CSS files beyond index.css) |
| Build config | TypeScript (vite.config.ts, tsconfig.json) |

Everything is TypeScript end-to-end. There is no JavaScript in the source tree.

---

## 4. Frontend — `artifacts/infrastructure-copilot`

### Framework & Build

| Tool | Version / Role |
|---|---|
| **React** | UI library — component tree, hooks, context |
| **Vite** | Dev server + production bundler (with `@replit/vite-plugin-*` for Replit proxy compatibility) |
| **Wouter** | Lightweight client-side router (replaces React Router; ~3 KB) |
| **Tailwind CSS** | Utility-first styling with `tw-animate-css` for animation utilities |
| **TypeScript** | Full static typing across all components and API calls |

### UI Component System

The entire component library is hand-assembled from **Radix UI primitives** wrapped in Tailwind-styled components (the shadcn/ui pattern). Components live in `src/components/ui/`:

| Category | Components |
|---|---|
| **Inputs** | `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `switch.tsx`, `radio-group.tsx`, `slider.tsx`, `input-otp.tsx` |
| **Overlays** | `dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`, `drawer.tsx` |
| **Navigation** | `sidebar.tsx`, `tabs.tsx`, `navigation-menu.tsx`, `breadcrumb.tsx`, `menubar.tsx`, `dropdown-menu.tsx`, `context-menu.tsx` |
| **Feedback** | `sonner.tsx` (toast notifications), `alert.tsx`, `progress.tsx`, `skeleton.tsx`, `spinner.tsx` |
| **Layout** | `card.tsx`, `separator.tsx`, `resizable.tsx`, `scroll-area.tsx`, `aspect-ratio.tsx`, `collapsible.tsx`, `accordion.tsx` |
| **Data display** | `table.tsx`, `badge.tsx`, `avatar.tsx`, `chart.tsx` (Recharts wrapper), `calendar.tsx`, `pagination.tsx` |
| **Custom** | `status-badge.tsx` (online/offline/unknown chips), `metrics-bar.tsx` (CPU/Mem/Disk bars), `empty.tsx` (empty state), `notifications-popover.tsx`, `ssh-terminal.tsx` |

### Third-Party UI Libraries

| Library | Purpose |
|---|---|
| **@radix-ui/*** | Accessible, headless primitive components (dialogs, popovers, tabs, etc.) |
| **lucide-react** | Icon set (consistent stroke icons across the entire UI) |
| **react-icons** | Supplementary icon packs |
| **framer-motion** | Page transition animations and micro-interactions |
| **recharts** | Charting library for monitoring graphs and resource usage |
| **embla-carousel-react** | Carousel/slider component |
| **react-day-picker** | Date picker calendar used in report generation dialogs |
| **date-fns** | Date formatting and arithmetic |
| **vaul** | Mobile-friendly drawer component |
| **cmdk** | Command palette (⌘K) component |
| **next-themes** | Dark/light theme toggling |

### Forms & Validation

| Library | Role |
|---|---|
| **react-hook-form** | Form state management with minimal re-renders |
| **@hookform/resolvers** | Bridges react-hook-form with Zod schemas |
| **zod** | Schema-based runtime validation (shared types with backend) |
| **input-otp** | OTP (one-time password) input field for email verification |

### Data Fetching

| Library | Role |
|---|---|
| **@tanstack/react-query** | Server state management — caching, background refetch, optimistic updates |
| **@workspace/api-client-react** | Auto-generated React Query hooks from the OpenAPI spec (lives in `lib/api-zod`) |

All API calls go through generated hooks (`useListServers`, `useGetServer`, `useCreateDeployment`, etc.) so the frontend and backend stay in sync via the shared schema.

### SSH Terminal

- **@xterm/xterm** — full in-browser terminal emulator (renders a PTY in a `<canvas>`)
- **@xterm/addon-fit** — resizes the xterm instance to fit its container div automatically
- **WebSocket** — raw WebSocket connection to `/api/ws/ssh` on the backend
- The terminal component (`ssh-terminal.tsx`) opens the WebSocket, hands data bidirectionally between xterm and the socket, and handles reconnection.

### Pages (Routes)

| Route | Page File | Description |
|---|---|---|
| `/` | `dashboard.tsx` | Summary stats, recent deployments, active alerts |
| `/servers` | `servers/index.tsx` | Server inventory table with search, filter, add/delete |
| `/servers/:id` | `servers/detail.tsx` | Single server detail, SSH terminal, scan results |
| `/deployments` | `deployments/index.tsx` | Deployment list and status board |
| `/deployments/:id` | `deployments/detail.tsx` | Single deployment detail and log output |
| `/templates` | `templates.tsx` | Script template library with AI Auto-fill |
| `/monitoring` | `monitoring.tsx` | Alert feed and server health overview |
| `/ai` | `ai-assistant.tsx` | Multi-agent AI chat (5 personas powered by Gemini) |
| `/audit-logs` | `audit-logs.tsx` | Expandable audit event log with metadata |
| `/documents` | `documents.tsx` | Document generator (placeholder & server report modes) |
| `/reports` | `reports.tsx` | Report generator with server scoping and date range |
| `/organization` | `organization.tsx` | Team membership, invite, admin create-user |
| `/user-requests` | `user-requests.tsx` | Pending registration approval queue (admin) |
| `/guidex` | `guidex.tsx` | Platform info / about page |
| `/login` | `login.tsx` | Email + password login |
| `/register` | `register.tsx` | New account registration (triggers OTP flow) |
| `/verify-email` | `verify-email.tsx` | OTP entry to confirm email address |
| `/awaiting-approval` | `awaiting-approval.tsx` | Holding page after email verification, before admin approval |

### Layout Shell

`AppShell` (`app-shell.tsx`) wraps every authenticated route. It renders:
- `sidebar.tsx` — collapsible navigation with role-based item visibility
- `notifications-popover.tsx` — bell icon with live notification count
- Top bar with user avatar and session context

---

## 5. Backend — `artifacts/api-server`

### Framework & Runtime

| Tool | Role |
|---|---|
| **Express** | HTTP request routing and middleware |
| **Node.js** (via `tsx`) | Runtime — TypeScript executed directly without a compile step |
| **pino** + **pino-http** | Structured JSON request logging |
| **cors** | Cross-origin request handling for the proxied frontend |
| **cookie-parser** | Session cookie parsing |

### Authentication

| Library | Role |
|---|---|
| **jsonwebtoken (JWT)** | Stateless session tokens issued on login, verified on every request via `authMiddleware` |
| **bcryptjs** | Password hashing (salted bcrypt, cost factor 10) |
| **nodemailer** | Sends OTP verification and password-reset emails over SMTP |

**Auth flow:**
1. User registers → OTP generated → email sent via nodemailer → user enters OTP
2. Email verified → status becomes `pending_approval`
3. Admin approves → status becomes `active` → user can log in
4. Admins can also create accounts directly (bypassing OTP/approval) via `/auth/admin/create-user`

### Database Access

| Library | Role |
|---|---|
| **Drizzle ORM** | Type-safe query builder — all queries are fully typed against the schema |
| **pg** (node-postgres) | PostgreSQL driver |
| **@workspace/db** | Internal package that exports the Drizzle `db` client and all table definitions |

### WebSocket / SSH

| Library | Role |
|---|---|
| **ws** | WebSocket server attached to the same HTTP server on path `/api/ws/ssh` |
| **ssh2** | Full SSH2 client — opens a PTY channel on the remote server, pipes data to/from the WebSocket |

### AI Integration

All AI calls use the **Replit AI Integrations proxy** which exposes an OpenAI-compatible endpoint backed by **Gemini 2.0 Flash**. Secrets `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` are injected at runtime.

Five agent personas are defined in `routes/ai.ts`, each with a distinct system prompt:

| Agent ID | Persona |
|---|---|
| `copilot` | General infrastructure assistant |
| `security` | Security auditor and hardening advisor |
| `deployment` | Deployment pipeline and CI/CD specialist |
| `troubleshooter` | Incident response and root-cause analyst |
| `database` | Database performance and query advisor |

Each chat request loads the last 20 messages from the conversation as context before calling Gemini.

### API Route Modules

| File | Routes Covered |
|---|---|
| `routes/auth.ts` | Register, verify OTP, login, logout, reset password, admin create-user, pending-users list, approve/decline |
| `routes/servers.ts` | CRUD for servers and server groups, TCP test-connection, health endpoint, server scan |
| `routes/deployments.ts` | CRUD for deployments, status updates, recent deployments |
| `routes/templates.ts` | CRUD for script templates, AI script analyzer (`/analyze`) |
| `routes/monitoring.ts` | Alerts CRUD, monitoring overview |
| `routes/ai.ts` | Conversations, message send (with Gemini), conversation history |
| `routes/audit.ts` | Audit log listing with filters |
| `routes/documents.ts` | Document generation (placeholder templates + server reports) |
| `routes/reports.ts` | Report generation with server scoping and date range |
| `routes/organizations.ts` | Org stats, member management |
| `routes/notifications.ts` | Notification listing and mark-as-read |

---

## 6. Database — `lib/db`

### Engine & ORM

- **PostgreSQL** (Replit-managed, accessed via `DATABASE_URL`)
- **Drizzle ORM** with `drizzle-kit` for schema diffing and migrations (`db push`)

### Schema Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | id, email, password_hash, role, status, otp | User accounts with bcrypt passwords and verification state |
| `organizations` | id, name, slug, owner_id | Multi-tenant grouping unit |
| `org_members` | org_id, user_id, role | Many-to-many membership with per-org role |
| `servers` | id, org_id, host, ssh_port, ssh_username, ssh_auth_method, status (enum), cpu_usage, mem_usage, disk_usage, scan_data | Remote server registry |
| `server_groups` | id, org_id, name, color | Logical grouping of servers |
| `templates` | id, org_id, name, software, description, script_content, category, version | Script templates for deployments |
| `deployments` | id, org_id, server_id, template_id, status (enum), log_output, started_at, finished_at | Deployment execution records |
| `ai_conversations` | id, org_id, user_id, title, agent_id | AI chat sessions |
| `ai_messages` | id, conversation_id, role, content, created_at | Individual chat messages |
| `monitoring_alerts` | id, org_id, server_id, severity, message, resolved_at | Infrastructure alerts |
| `documents` | id, org_id, title, type, content, server_id | Generated documents |
| `reports` | id, org_id, title, type, content, server_id, date_from, date_to | Generated reports |
| `audit_logs` | id, org_id, user_id, action, resource_type, resource_id, resource_name, ip_address, metadata | Immutable audit trail |
| `notifications` | id, user_id, title, message, read, created_at | In-app notifications |

### Enums

| Enum | Values |
|---|---|
| `user_status` | `pending_verification`, `pending_approval`, `active`, `declined` |
| `user_role` | `engineer`, `reviewer`, `admin` |
| `server_status` | `online`, `offline`, `unknown`, `maintenance` |
| `deployment_status` | `pending`, `running`, `success`, `failed`, `cancelled` |
| `alert_severity` | `info`, `warning`, `critical` |

---

## 7. Shared Libraries

### `lib/api-zod`

Auto-generated from the OpenAPI specification using **Orval**. Produces:
- Zod schemas for every request/response body
- TypeScript types inferred from those schemas
- Axios-based API client functions

These are consumed by `@workspace/api-client-react` which wraps everything in `@tanstack/react-query` hooks.

### `@workspace/api-client-react`

Provides typed hooks like:
- `useListServers(orgId)` → `{ data: Server[], isLoading, error }`
- `useCreateDeployment()` → `{ mutate, isPending }`
- `useGetAuditLogs(orgId, filters)` → paginated audit data

This keeps the frontend completely decoupled from raw fetch calls and gives automatic caching, background refresh, and error boundaries.

---

## 8. Infrastructure & Deployment

| Concern | Solution |
|---|---|
| **Hosting** | Replit (monorepo, path-based proxy routing) |
| **Preview routing** | Each artifact gets a unique path prefix (`/infrastructure-copilot`, `/api`) via Replit's shared proxy |
| **Port management** | Each service reads `PORT` from environment — no hardcoded ports |
| **Secrets** | Managed via Replit Secrets (never in source code): `SESSION_SECRET`, `SMTP_*`, `RESEND_API_KEY`, `AI_INTEGRATIONS_*`, `BOOTSTRAP_ADMIN_PASSWORD` |
| **Database** | Replit-managed PostgreSQL; `DATABASE_URL` injected automatically |
| **Email** | Nodemailer over SMTP (configurable via `SMTP_HOST/PORT/USER/PASS/FROM` secrets) |
| **AI** | Replit AI Integrations proxy → Gemini 2.0 Flash (OpenAI-compatible API surface) |

---

## 9. Engineering Challenges & How They Were Solved

### Challenge 1 — SSH Terminal Race Condition

**Problem:** The xterm terminal was rendering blank. The `onData` handler (which sends keystrokes to the WebSocket) was registered before the WebSocket connection was established, meaning early keystrokes were dropped and terminal dimensions weren't measured correctly.

**Root cause:** A `setTimeout(500ms)` was used to delay terminal initialization, but this raced against the browser paint cycle — on slower connections the terminal container was still `display:none` when xterm tried to measure it.

**Solution:** Moved `onData` registration inside `openTerminal(ws)`, which now receives the live WebSocket reference as a parameter. `openTerminal` is called from a `useEffect` that fires only after `connState === "connected"` (i.e., after the React re-render that makes the container visible). A `requestAnimationFrame` call inside the effect ensures the browser has painted the container before xterm measures its pixel dimensions for the `fit` addon.

---

### Challenge 2 — Zod v3 vs v4 Codegen Mismatch

**Problem:** Running `pnpm run codegen` (Orval) regenerates `lib/api-zod/src/generated/api.ts` using `z.looseObject({...})`, which is a Zod v4 API. The project uses Zod v3, so the generated file fails to compile.

**Solution:** After any codegen run, patch the file with:
```bash
sed -i 's/zod\.looseObject({/zod.object({/g' lib/api-zod/src/generated/api.ts
```
This is documented as a mandatory post-codegen step. The root issue is an Orval template targeting a newer Zod version than what the project pins.

---

### Challenge 3 — Server Creation 500 Error (Empty String vs. Null)

**Problem:** The "Add Server" form submitted `groupId` as an empty string `""` when the user left the group selector blank. The backend used `req.body.groupId ?? null` — but the nullish coalescing operator (`??`) only replaces `null` and `undefined`, not empty strings. PostgreSQL rejected `""` for an integer column, causing a 500.

**Solution:** Changed the insert logic to `req.body.groupId ? parseInt(req.body.groupId) : null`, which correctly coerces any falsy value (empty string, `0`, `null`, `undefined`) to `null` before the DB write.

---

### Challenge 4 — Admin Password Hash Corruption After Merges

**Problem:** After certain task-agent merges, the super-admin's `password_hash` column in the database was set to the literal string `"password"` (plain text) instead of a bcrypt hash. The admin could no longer log in.

**Root cause:** Seed scripts from different branches wrote the admin row differently — one branch stored the hash, another stored the raw value.

**Solution:** The `seedSuperAdmin()` function (called on every API server startup) was updated to always re-hash the password using bcrypt regardless of what is already in the database, ensuring the stored value is always a valid bcrypt hash even after a bad merge.

---

### Challenge 5 — Audit Logs API Shape Mismatch

**Problem:** The frontend expected the audit logs endpoint to return a plain array. The actual API response was `{ items: [...], total: N }`. This caused the entire audit logs page to render empty silently.

**Solution:** Added a defensive unwrap at the call site:
```ts
const rows = Array.isArray(response) ? response : response?.items ?? [];
```
This handles both the old array shape and the new paginated object shape, making the component resilient to future pagination changes.

---

### Challenge 6 — No Real Data in Monitoring / Server Health

**Problem:** The monitoring page and server detail page were populated with hardcoded `MOCK_ALERTS` and `MOCK_SERVERS` arrays, and the health endpoint generated fake random CPU/memory values on every call. This meant the displayed data bore no relation to the database.

**Solution:**
- Removed all mock data constants and fallbacks from `monitoring.tsx` and `servers/detail.tsx`.
- Rewrote the health endpoint to return only stored database values (`cpu_usage`, `mem_usage`, `disk_usage`, `last_seen`) — returning `null` for metrics that haven't been recorded yet.
- Added proper empty states to the UI when no data exists, rather than faking it.

---

### Challenge 7 — Gemini AI Integration Setup

**Problem:** The AI assistant originally used a hardcoded string-matching function (`generateAiResponse()`) that pattern-matched keywords in the user's message and returned canned responses. It had no real intelligence and no conversation memory.

**Solution:** Integrated Gemini 2.0 Flash via Replit's AI Integrations proxy (OpenAI-compatible endpoint). The backend now:
1. Loads the last 20 messages from the conversation as history
2. Prepends the selected agent's system prompt
3. Sends the full context to Gemini
4. Streams the response back and persists it to the `ai_messages` table

Five distinct agent personas were defined, each with a system prompt tailored to their domain (security, deployment, troubleshooting, databases, general copilot).

---

### Challenge 8 — Templates Missing Script Storage

**Problem:** The templates table had no column to store the actual shell script content. Templates were name/description metadata only, making them useless for actual deployment execution.

**Solution:** Added a `script_content TEXT` column to the `templates` schema via Drizzle and ran `db push` to apply it to the live database. The create/edit API routes were updated to accept and persist `scriptContent`. The frontend template dialog was redesigned so the script textarea is the primary input, with an "AI Auto-fill" button that calls a `/templates/analyze` endpoint — which sends the script to Gemini and returns the inferred software name and description.

---

## 10. Key Design Principles Applied

1. **No mock data in production paths** — every data surface shows either real DB values or an honest empty state.
2. **Role-based access** — `engineer`, `reviewer`, and `admin` roles gate API endpoints via `authMiddleware` checks; the sidebar hides irrelevant items per role.
3. **Type safety end-to-end** — from DB schema (Drizzle types) → API response (Zod schemas) → frontend hooks (React Query + generated types), there are no `any` casts in the data flow.
4. **Audit everything** — every mutating action (server create, deployment run, user approval, document generate) writes a row to `audit_logs` with actor, resource, IP, and timestamp.
5. **Fail explicitly** — errors surface as toasts or inline error states; no silent fallbacks that hide failures from the user.
