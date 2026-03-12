
## [T1 complete] Strip old dashboard code
- Files deleted: apps/web/src/server/trpc/, apps/web/src/server/admin-orchestrator.ts, apps/web/src/server/ws/sse.ts, apps/web/src/server/ws/handlers/, apps/web/src/server/db.ts, apps/web/src/app/dashboard/, apps/web/prisma/, apps/daemon/src/session-manager.ts, apps/daemon/src/admin-handler.ts, packages/shared/src/ws-protocol/dashboard-events.ts
- Additional files deleted (also dashboard-related, not listed in task but caused typecheck failures): apps/web/src/app/api/events/, apps/web/src/app/api/trpc/, apps/web/src/components/admin/, apps/web/src/components/layout/, apps/web/src/components/projects/, apps/web/src/components/sessions/, apps/web/src/components/tasks/, apps/web/src/hooks/useSSE.ts, apps/web/src/lib/trpc-client.tsx, apps/web/src/lib/trpc.ts
- Packages removed: @prisma/client, @trpc/client, @trpc/react-query, @trpc/server, prisma (devDep), @anthropic-ai/sdk was not present
- Also fixed: packages/shared/src/ws-protocol/index.ts (removed dashboard-events export), apps/daemon/src/index.ts (removed session-manager and admin-handler imports), apps/web/src/app/layout.tsx (removed TRPCProvider)
- Any issues encountered: Many more files than listed in task referenced deleted modules — had to delete all dashboard-related components, hooks, lib files, and api routes
- Typecheck status: PASS (4/4 packages, turbo cache confirmed clean)
