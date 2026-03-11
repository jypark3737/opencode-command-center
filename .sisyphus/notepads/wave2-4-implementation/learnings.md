## [2026-03-11] Wave 1 Complete — Session Start

### Critical Constraints (ALL agents MUST follow):
- Working dir: /mnt/ssd_mnt1/pjy/opencode-command-center
- Prisma v5.22.0 local binary: apps/web/node_modules/.bin/prisma (NOT bunx prisma which resolves to v7)
- DATABASE_URL: postgresql://postgres:yGahjtCwNVhYPrHgpEhfXBuAHxbDZBDD@mainline.proxy.rlwy.net:30643/railway
- Tailwind v4: use @import "tailwindcss" (NOT @tailwind directives)
- Next.js 15: dynamic route params are Promise<{...}> — must await params
- NO @anthropic-ai/sdk anywhere
- NO shadcn/ui — inline styles only
- Dark theme: bg #0a0a0a/#1a1a1a/#2a2a2a, accent #6366f1

### Verification Command:
cd /mnt/ssd_mnt1/pjy/opencode-command-center && bun run typecheck
Expected: 4/4 packages pass, 0 errors

### tRPC pattern (init.ts):
import { createTRPCRouter, protectedProcedure } from "../init";

### WS message types (shared package):
- AdminRunCommandMessage (server→daemon): { type: "admin_run_command", requestId, command, projectPath?, sessionId? }
- AdminRunResultMessage (daemon→server): { type: "admin_run_result", requestId, deviceId, output, exitCode, error? }

### Wave 1 Completed Files:
- packages/shared/src/types/admin.ts — AdminTodoStatus, AdminTodo types
- packages/shared/src/ws-protocol/client-messages.ts — AdminRunResultMessage added
- packages/shared/src/ws-protocol/server-messages.ts — AdminRunCommandMessage added
- packages/shared/src/ws-protocol/dashboard-events.ts — 4 admin events added
- apps/web/prisma/schema.prisma — AdminTodo model, AdminTodoStatus enum, title on Session
- apps/daemon/src/opencode/sqlite-reader.ts — title extraction added
- apps/daemon/install.sh — supervisord integration
