# Task 6: Add 3 New Procedures to Sessions tRPC Router

## Status: ✅ COMPLETED

### Changes Made

Added 3 new procedures to `/mnt/ssd_mnt1/pjy/opencode-command-center/apps/web/src/server/trpc/routers/sessions.ts`:

#### 1. `syncSessionTitles` (Mutation)
- **Location**: Line 55
- **Input**: Array of objects with `sessionId` and `title`
- **Behavior**: Bulk-updates session titles using `Promise.allSettled`
- **Output**: Returns `{ updated: number, total: number }`

#### 2. `getSessionDetail` (Query)
- **Location**: Line 79
- **Input**: Session `id`
- **Behavior**: Fetches session with device, currentTask (with subTodos and result), and adminTodos
- **Output**: Session object with nested device, currentTask, and adminTodos array

#### 3. `getSessionTasks` (Query)
- **Location**: Line 103
- **Input**: `sessionId`
- **Behavior**: Fetches all tasks for a session with subTodos, result details, and project info
- **Output**: Array of tasks ordered by status and creation date

### Verification

✅ All 9 procedures present in router:
- list (original)
- listByDevice (original)
- get (original)
- **syncSessionTitles (NEW)**
- **getSessionDetail (NEW)**
- **getSessionTasks (NEW)**
- create (original)
- updateStatus (original)
- delete (original)

✅ TypeScript type checking: **PASSED**
- Tasks: 4 successful, 4 total
- No type errors detected
- Evidence saved to: `task-6-typecheck.txt`

### Implementation Details

- Used `protectedProcedure` for all 3 new procedures (consistent with existing patterns)
- Used Zod for input validation (consistent with existing patterns)
- Proper Prisma query includes with nested relations
- No modifications to existing procedures
- No changes to Prisma schema
- No new dependencies added
