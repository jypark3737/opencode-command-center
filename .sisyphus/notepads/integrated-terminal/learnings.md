
## [T1 complete] Strip old dashboard code
- Files deleted: apps/web/src/server/trpc/, apps/web/src/server/admin-orchestrator.ts, apps/web/src/server/ws/sse.ts, apps/web/src/server/ws/handlers/, apps/web/src/server/db.ts, apps/web/src/app/dashboard/, apps/web/prisma/, apps/daemon/src/session-manager.ts, apps/daemon/src/admin-handler.ts, packages/shared/src/ws-protocol/dashboard-events.ts
- Additional files deleted (also dashboard-related, not listed in task but caused typecheck failures): apps/web/src/app/api/events/, apps/web/src/app/api/trpc/, apps/web/src/components/admin/, apps/web/src/components/layout/, apps/web/src/components/projects/, apps/web/src/components/sessions/, apps/web/src/components/tasks/, apps/web/src/hooks/useSSE.ts, apps/web/src/lib/trpc-client.tsx, apps/web/src/lib/trpc.ts
- Packages removed: @prisma/client, @trpc/client, @trpc/react-query, @trpc/server, prisma (devDep), @anthropic-ai/sdk was not present
- Also fixed: packages/shared/src/ws-protocol/index.ts (removed dashboard-events export), apps/daemon/src/index.ts (removed session-manager and admin-handler imports), apps/web/src/app/layout.tsx (removed TRPCProvider)
- Any issues encountered: Many more files than listed in task referenced deleted modules — had to delete all dashboard-related components, hooks, lib files, and api routes
- Typecheck status: PASS (4/4 packages, turbo cache confirmed clean)

## [T8 complete] Daemon Session Lifecycle Manager
- Created `apps/daemon/src/session-lifecycle.ts` with `SessionLifecycle` class
- `TunnelRequestMessage` already had `sessionId: string` (pre-existing from previous task) — no change needed
- `TunnelHandler.handleRequest` already used `msg.sessionId` — no change needed
- `OpenCodeProcess` constructor: `(opencodeBin: string, projectPath: string, port?: number, sessionId?: string)` — pass `undefined` for port to get random allocation
- `startSession()` is idempotent: returns existing port if process already running
- `touchSession()` resets 30-min idle timer; called both on `start_session` and every `tunnel_request`
- Port registration flow: `sessionLifecycle.startSession()` → `tunnelHandler.registerPort(sessionId, port)` in index.ts
- `stopAll()` called in shutdown handler before disconnect
- Typecheck: 0 errors, 4/4 packages pass

## [T9 complete] Hub Session Picker UI with Iframe Tabs
- Created 6 new files: 2 API routes + 3 components + updated page.tsx
- API routes: GET /api/devices (uses agentRegistry + deviceSessions), POST /api/sessions/start
- DeviceSidebar: polls /api/devices every 5s, collapsible device groups, shows Starting… badge during webPort polling
- SessionTabs: horizontal tab bar, active tab highlighted with blue bottom border (bg-gray-800 inactive, bg-gray-700 active)
- SessionIframe: mounts all iframes (only hides inactive ones via display:none for persistence), shows loading spinner via onLoad event
- page.tsx: two-panel layout (280px sidebar + flex-1 main), auto-start flow: POST start_session → poll every 2s up to 30s for webPort
- closeTab correctly selects next adjacent tab after closing
- Tunnel URL pattern: `/t/{deviceId}/{sessionId}/` used as iframe src
- No @ts-ignore, no as any, no shadcn — plain inline styles + Tailwind vars
- Typecheck: 0 errors, 4/4 packages pass (turbo typecheck --force confirmed)

## [T10 complete] Auth + Error Handling + Connection Recovery
- `apps/web/src/middleware.ts` at src/ level (NOT apps/web/middleware.ts) — Next.js middleware location confirmed
- HTTP Basic Auth: check `HUB_PASSWORD` env, if unset skip auth; extract password after first colon in decoded base64
- proxy.ts: added `errorPage(status, title, message)` helper returning dark-theme HTML (#030712 bg); replaced all 4 inline error strings
- tunnel-handler.ts: session-not-running check was already present (lines 30-37); added `totalBytes` counter + 50MB cap (`MAX_RESPONSE_BYTES = 50*1024*1024`); sends `tunnel_response_error` if exceeded and returns early (no `tunnel_response_end` sent)
- index.ts: `register_ack` already sent `sessions_list` — no change needed; confirmed no port re-registration required since `sessions_list` includes webPort
- ws/server.ts: `PendingRequest.deviceId` already existed in proxy.ts; imported `pendingRequests` alongside `resolvePendingRequest`; close handler iterates map, clears timeout, ends response, deletes entry
- Typecheck: 0 errors, 4/4 packages pass

## [T11 complete] Update install.sh for terminal hub architecture
- Banner updated to "OpenCode Terminal Hub — Daemon v1.0.0"
- Removed "execute tasks" reference from opencode warning message
- Added prompts for: DEVICE_ID (with auto-generate + allow override), OPENCODE_BIN, OPENCODE_DB_PATH, PROJECTS_FILTER
- Replaced PROJECTS env var with PROJECTS_FILTER (comma-separated path prefixes)
- PROJECTS_FILTER added to both .env write and supervisord environment= line
- Header comment updated with full env var documentation block
- bash -n syntax check: PASS
- No references to task/admin/orchestrat remain
