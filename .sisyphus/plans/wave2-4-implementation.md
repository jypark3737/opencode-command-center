# OpenCode Command Center — Waves 2–4 Implementation

## TL;DR

> **Quick Summary**: Complete the remaining 13 implementation tasks + 4 verification tasks for the 5-point session rework. Wave 1 (shared types, Prisma schema, install script, SQLite reader) is done. This plan covers Waves 2–4: backend routers, daemon handler, sidebar restructure, session detail page, admin todo panel, batch instruction conversion, auto-assignment, verification loop, SSE events, Anthropic API cleanup, and final typecheck.
> 
> **Deliverables**:
> - Rewritten admin router (no Anthropic API — uses admin_run_command WS dispatch)
> - Enhanced sessions router with syncSessionTitles, getSessionDetail, getSessionTasks
> - Daemon admin_run_command handler (spawns opencode run, returns output)
> - Device→project sidebar hierarchy
> - Session titles displayed throughout UI
> - Session detail page /dashboard/sessions/[sessionId]
> - AdminTodoPanel with natural language input + status display
> - Batch todo→instruction conversion via opencode run
> - Auto-assignment of converted instructions to idle worker sessions
> - Admin verification loop (read output → approve/correct, 3 retry max)
> - SSE events for admin orchestrator status
> - Full Anthropic API removal + typecheck pass
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves (Wave 2: 5 tasks, Wave 3: 4 tasks, Wave 4: 4 tasks)
> **Critical Path**: T6→T7→T12→T13→T14

---

## Context

### Original Request
5-point rework of OpenCode Command Center:
1. Projects inside device hierarchy
2. Daemon persistence (supervisord — DONE in Wave 1)
3. Session titles from OpenCode SQLite
4. Session detail page with tasks/todos
5. Admin agent via OpenCode (not Anthropic API) for todo conversion, assignment, and verification

### Interview Summary
- Single user ("just me"), ~5 devices
- NO Anthropic API spending — admin agent uses opencode run (user's Claude subscription)
- Batch todo→instruction conversion (batch up to 5 pending todos per opencode run call)
- 3-retry hard cap on verification loops
- Inline Tailwind styles, dark theme (#0a0a0a/#1a1a1a/#2a2a2a, accent #6366f1)
- Next.js 15 dynamic route params are Promise — must await params
- Prisma v5.22.0 (local binary), NOT v7

### Wave 1 Status (COMPLETE ✅)
- T1: Shared types + WS protocol (AdminTodo types, AdminRunCommandMessage, AdminRunResultMessage, 4 dashboard events)
- T2: Prisma schema (AdminTodo model, AdminTodoStatus enum, title on Session) — pushed to DB
- T3: Install script with supervisord
- T4: SQLite reader with session title extraction
- Full typecheck: 4/4 packages, 0 errors

---

## Work Objectives

### Core Objective
Complete the remaining 13 tasks across Waves 2–4 to deliver a fully functional admin orchestration system where natural language todos are converted to precise instructions, assigned to worker sessions, and verified automatically.

### Definition of Done
- [x] bun run typecheck → 4/4 packages pass, 0 errors
- [x] No @anthropic-ai/sdk imports anywhere in codebase
- [x] Admin todo panel accepts natural language input
- [x] Session detail page loads with title, path, tasks, admin todos
- [x] Sidebar shows device→project hierarchy

### Must Have
- Admin router dispatches admin_run_command via WS to daemon, NOT Anthropic API
- Batch todo→instruction conversion (batch up to 5 pending todos per opencode run call)
- 3-retry hard cap on verification loops
- Session titles shown in SessionList, TaskCard, TaskCreateForm dropdown
- Device→project hierarchy in sidebar
- Session detail page with current task info and admin todo status

### Must NOT Have (Guardrails)
- ❌ NO @anthropic-ai/sdk import or usage anywhere
- ❌ NO per-todo LLM calls (batch only)
- ❌ NO infinite verification loops (hard cap 3)
- ❌ NO shadcn/ui components (inline Tailwind only)
- ❌ NO Tailwind v3 @tailwind directives
- ❌ NO synchronous params access in Next.js 15 dynamic routes
- ❌ NO Prisma v7 syntax
- ❌ NO bunx prisma (use apps/web/node_modules/.bin/prisma)
- ❌ NO systemd service files

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (no test framework configured)
- **Automated tests**: None
- **Framework**: None
- **Primary verification**: bun run typecheck (tsc --noEmit across all packages)

### QA Policy
Every task MUST run bun run typecheck after implementation.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 2 (5 tasks — backend + daemon + UI foundation):
├── T5:  Sidebar device→project hierarchy [visual-engineering]
├── T6:  Sessions router — syncSessionTitles, getSessionDetail, getSessionTasks [quick]
├── T7:  Admin router rewrite — remove Anthropic, add WS dispatch [unspecified-high]
├── T8:  Daemon admin_run_command handler [unspecified-high]
└── T9:  Session title display in UI [quick]

Wave 3 (4 tasks — pages + admin orchestration):
├── T10: Session detail page /dashboard/sessions/[sessionId] [visual-engineering]
├── T11: AdminTodoPanel — NL todo input + status display [visual-engineering]
├── T12: Batch todo→instruction conversion via opencode run [deep]
└── T13: Auto-assignment to idle worker sessions [unspecified-high]

Wave 4 (4 tasks — verification + cleanup):
├── T14: Admin verification loop (3 retry max) [deep]
├── T15: SSE events for admin orchestrator [quick]
├── T16: Cleanup — remove ALL Anthropic API references [quick]
└── T17: Full typecheck + lint pass [quick]

Wave FINAL (4 tasks — independent review):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real manual QA [unspecified-high]
└── F4: Scope fidelity check [deep]

Critical Path: T6 → T7 → T12 → T13 → T14
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T5   | — | T10 |
| T6   | — | T7, T10 |
| T7   | T6 | T11, T12, T15 |
| T8   | — | T12 |
| T9   | — | T10 |
| T10  | T5, T6, T9 | F3 |
| T11  | T7 | T12 |
| T12  | T7, T8, T11 | T13 |
| T13  | T12 | T14 |
| T14  | T13 | T15 |
| T15  | T7, T14 | T16 |
| T16  | T15 | T17 |
| T17  | T16 | F1-F4 |

---

## TODOs

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — oracle
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Compare deliverables against plan.
  Output: Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT

- [x] F2. **Code Quality Review** — unspecified-high
  Run bun run typecheck. Review all changed files for: as any, @ts-ignore, empty catches, console.log in prod paths. Check for @anthropic-ai/sdk ANYWHERE.
  Output: Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT

- [x] F3. **Real Manual QA** — unspecified-high + playwright skill
  Navigate dashboard. Verify sidebar shows device→project hierarchy. Click session → verify detail page. Submit admin todo → verify status updates.
  Output: Scenarios [N/N pass] | VERDICT

- [x] F4. **Scope Fidelity Check** — deep
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance.
  Output: Tasks [N/N compliant] | VERDICT

---

## Commit Strategy

After each wave:
- **Wave 2**: `feat(wave2): sessions router, admin rewrite, daemon handler, sidebar hierarchy, session titles`
- **Wave 3**: `feat(wave3): session detail page, admin todo panel, batch conversion, auto-assignment`
- **Wave 4**: `feat(wave4): verification loop, SSE events, anthropic cleanup, final typecheck`

---

## Success Criteria

### Verification Commands
```bash
bun run typecheck  # Expected: 4/4 packages pass, 0 errors
grep -r "anthropic" apps/web/src/ --include="*.ts" --include="*.tsx"  # Expected: 0 matches
grep -r "@anthropic-ai/sdk" . --include="*.ts"  # Expected: 0 matches
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] bun run typecheck passes 4/4
- [x] No Anthropic API references anywhere
- [x] Admin todo input works
- [x] Session detail page renders
- [x] Sidebar shows device→project hierarchy

## Task Details

### Wave 2

- [x] 5. Sidebar Restructure — Device→Project Hierarchy

  **What to do**:
  - Rewrite `apps/web/src/components/layout/Sidebar.tsx` to remove the separate "Projects" and "Devices" sections
  - Replace with a SINGLE "Devices" section that shows a tree: Device → expand → Projects under that device → expand → Sessions under that project
  - The DeviceList component (`apps/web/src/components/layout/DeviceList.tsx`) already has the expand/collapse pattern and session nesting — use it as the base but add project grouping between device and sessions
  - Modify `apps/web/src/components/layout/ProjectList.tsx` to accept a `deviceId` prop and filter projects by device, OR inline the project rendering into DeviceList
  - Keep `apps/web/src/components/layout/Sidebar.tsx` header (OC logo + "Command Center") and footer (version) unchanged
  - Tree structure: Device (expand ▶) → Project links (clickable, navigate to `/dashboard/{projectId}`) → Sessions (status badges)
  - The `devices.list` query already includes `projects: { select: { id, name, path } }` — use this for project grouping
  - Dark theme: bg #111, borders #2a2a2a, text #ccc, accent #6366f1, uppercase section headers #888
  - NO shadcn/ui — inline styles only

  **Must NOT do**:
  - Do NOT use any component library
  - Do NOT change the Sidebar header or footer
  - Do NOT add new tRPC queries (existing `devices.list` includes projects)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI restructure with complex nested tree layout
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7, T8, T9)
  - **Blocks**: T10
  - **Blocked By**: None

  **References**:
  - `apps/web/src/components/layout/Sidebar.tsx` — Current flat layout with separate Projects/Devices sections. REWRITE the scrollable content area (lines 44-108)
  - `apps/web/src/components/layout/DeviceList.tsx` — Existing expand/collapse pattern. This component already nests SessionList inside each device. Add a project grouping layer between device and sessions
  - `apps/web/src/components/layout/ProjectList.tsx` — Current flat project list. Either refactor to accept deviceId filter or inline into DeviceList
  - `apps/web/src/server/trpc/routers/devices.ts:6-14` — devices.list query already includes `projects: { select: { id, name, path } }` — no backend changes needed
  - `apps/web/src/components/sessions/SessionList.tsx` — SessionList takes `deviceId` prop. In the new hierarchy, sessions should be grouped under their project (match by projectPath)

  **Acceptance Criteria**:
  - [ ] Sidebar shows "Devices" section (not separate Projects/Devices)
  - [ ] Each device expands to show its projects
  - [ ] Each project is a clickable link to `/dashboard/{projectId}`
  - [ ] Sessions show under their respective device (existing SessionList behavior preserved)
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Sidebar renders device→project hierarchy
    Tool: Playwright
    Steps:
      1. Navigate to dashboard URL
      2. Verify sidebar contains "Devices" section header
      3. Click on a device name to expand
      4. Verify project links appear under the device
      5. Click a project link → verify navigation to /dashboard/{projectId}
    Expected Result: Sidebar shows hierarchical tree Device→Project
    Evidence: .sisyphus/evidence/task-5-sidebar-hierarchy.png
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(sidebar): restructure to device→project hierarchy`
  - Files: `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/components/layout/DeviceList.tsx`, `apps/web/src/components/layout/ProjectList.tsx`

---

- [x] 6. tRPC Sessions Router — Add syncSessionTitles, getSessionDetail, getSessionTasks

  **What to do**:
  - Edit `apps/web/src/server/trpc/routers/sessions.ts` to add 3 new procedures:
  
  1. `syncSessionTitles` mutation:
     - Input: `{ titles: Array<{ sessionId: string, title: string }> }`
     - For each entry, `db.session.update({ where: { id }, data: { title } })`
     - Use `Promise.allSettled` to handle partial failures
     - Return `{ updated: number, total: number }`
  
  2. `getSessionDetail` query:
     - Input: `{ id: string }`
     - Returns session with:
       - `device: { id, name, hostname, status }`
       - `currentTask` with `subTodos` and `result`
       - Also fetch `db.adminTodo.findMany({ where: { assignedSessionId: id } })` and merge into response
     - Return `{ ...session, adminTodos }`
  
  3. `getSessionTasks` query:
     - Input: `{ sessionId: string }`
     - `db.task.findMany({ where: { sessionId } })` with includes for subTodos, result, project
     - Order by status ASC, createdAt DESC

  **Must NOT do**:
  - Do NOT modify existing `list`, `listByDevice`, `get`, `create`, `updateStatus`, `delete` procedures
  - Do NOT change Prisma schema (already has `title` field)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward Prisma query additions to existing router
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7, T8, T9)
  - **Blocks**: T7, T10
  - **Blocked By**: None

  **References**:
  - `apps/web/src/server/trpc/routers/sessions.ts` — Current router with 6 procedures. ADD 3 new ones after `get` procedure (line 53). Keep existing procedures unchanged
  - `apps/web/src/server/trpc/routers/tasks.ts:8-33` — Pattern for query with includes (subTodos, result, session, project). Follow this pattern for getSessionTasks
  - `apps/web/prisma/schema.prisma:97-113` — Session model with title field, device relation, currentTask relation
  - `apps/web/prisma/schema.prisma:154-169` — AdminTodo model with assignedSessionId field. Query this in getSessionDetail
  - `apps/web/src/server/trpc/init.ts` — createTRPCRouter and protectedProcedure imports

  **Acceptance Criteria**:
  - [ ] `syncSessionTitles` mutation exists and updates session titles in batch
  - [ ] `getSessionDetail` query returns session + device + currentTask + adminTodos
  - [ ] `getSessionTasks` query returns tasks for a given sessionId with subTodos/result/project
  - [ ] All existing procedures unchanged
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Typecheck passes with new procedures
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-6-typecheck.txt

  Scenario: New procedures exist in router
    Tool: Bash
    Steps:
      1. grep -n "syncSessionTitles\|getSessionDetail\|getSessionTasks" apps/web/src/server/trpc/routers/sessions.ts
    Expected Result: All 3 procedure names found
    Evidence: .sisyphus/evidence/task-6-procedures.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(sessions): add syncSessionTitles, getSessionDetail, getSessionTasks`
  - Files: `apps/web/src/server/trpc/routers/sessions.ts`

---

- [x] 7. tRPC Admin Router — REWRITE (Remove Anthropic API, Add WS Dispatch)

  **What to do**:
  - FULLY REWRITE `apps/web/src/server/trpc/routers/admin.ts`
  - **REMOVE**: `import Anthropic from "@anthropic-ai/sdk"` (line 4), `const anthropic = new Anthropic(...)` (lines 6-8), and the entire `reviewTask` mutation that calls `anthropic.messages.create()` (lines 61-124)
  - **KEEP**: `getSystemStatus` query (lines 11-30) and `getHealthReport` query (lines 32-59) — these are pure Prisma queries, no Anthropic
  - **ADD** these new procedures:

  1. `submitTodos` mutation:
     - Input: `{ content: string }` (natural language text — may contain multiple todos separated by newlines)
     - Split content by newlines, filter empty, create `db.adminTodo.create()` for each line
     - Return array of created AdminTodo records
  
  2. `getTodos` query:
     - Input: optional `{ status?: AdminTodoStatus }` filter
     - `db.adminTodo.findMany()` ordered by createdAt DESC
     - Include all fields
  
  3. `cancelTodo` mutation:
     - Input: `{ id: string }`
     - `db.adminTodo.update({ where: { id }, data: { status: "CANCELLED" } })`
  
  4. `getOrchestratorStatus` query:
     - Returns a static object for now (will be wired to actual orchestrator in T12):
     - `{ isProcessing: false, currentAction: "idle", queueLength: 0 }`
  
  5. `triggerOrchestration` mutation:
     - For now: find all PENDING AdminTodos, get first connected device from agentRegistry, send `admin_run_command` WS message to that device
     - The command should be a prompt string that tells OpenCode to convert the batch of todos into precise instructions
     - Use `agentRegistry.getAll()[0]` to find a connected device
     - Send message: `{ type: "admin_run_command", requestId: crypto.randomUUID(), command: <prompt>, projectPath: undefined, sessionId: undefined }`
     - Update todos to status "CONVERTING"
     - Return `{ dispatched: true, todoCount: N }`

  - **ADD** new WS handler: Create `apps/web/src/server/ws/handlers/admin.ts` to handle `admin_run_result` messages from daemon
    - Parse output from daemon
    - Store converted instructions on AdminTodo records
    - Update status to "READY"
    - Broadcast SSE event `admin_todo_status_changed`

  - **UPDATE** `apps/web/src/server/ws/server.ts` to route `admin_run_result` messages to the new handler (add `else if (msg.type === "admin_run_result")` case)

  - Import `AdminTodoStatus` type from `@opencode-cc/shared` for the Zod enum

  **Must NOT do**:
  - Do NOT keep any @anthropic-ai/sdk import or usage
  - Do NOT call any external AI API
  - Do NOT remove getSystemStatus or getHealthReport

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex rewrite involving router, WS handler, and server routing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (but logically benefits from T6 being done first for type consistency)
  - **Parallel Group**: Wave 2 (with T5, T6, T8, T9)
  - **Blocks**: T11, T12, T15
  - **Blocked By**: T6 (soft — for type consistency)

  **References**:
  - `apps/web/src/server/trpc/routers/admin.ts` — CURRENT file to REWRITE. Lines 4,6-8: Anthropic imports to DELETE. Lines 11-59: getSystemStatus + getHealthReport to KEEP. Lines 61-124: reviewTask to DELETE AND REPLACE with new procedures
  - `apps/web/prisma/schema.prisma:143-169` — AdminTodo model and AdminTodoStatus enum. Use these for Prisma queries
  - `packages/shared/src/types/admin.ts` — AdminTodoStatus type export. Import for Zod enum validation
  - `packages/shared/src/ws-protocol/server-messages.ts:41-47` — AdminRunCommandMessage type. Use for WS dispatch
  - `packages/shared/src/ws-protocol/client-messages.ts:92-99` — AdminRunResultMessage type. Use in new handler
  - `packages/shared/src/ws-protocol/dashboard-events.ts:50-57` — admin_todo_status_changed event type. Use in SSE broadcast
  - `apps/web/src/server/ws/registry.ts` — agentRegistry singleton. Import to get connected devices for WS dispatch
  - `apps/web/src/server/ws/server.ts:37-64` — Message routing switch. Add admin_run_result case after task_verification (line 59)
  - `apps/web/src/server/ws/sse.ts` — sseBroadcaster.broadcast() for SSE events
  - `apps/web/src/server/ws/handlers/session.ts` — Pattern for WS handler: async function, Prisma updates, SSE broadcast

  **Acceptance Criteria**:
  - [ ] No @anthropic-ai/sdk import anywhere in admin.ts
  - [ ] getSystemStatus and getHealthReport preserved unchanged
  - [ ] submitTodos, getTodos, cancelTodo, getOrchestratorStatus, triggerOrchestration procedures exist
  - [ ] admin_run_result WS handler exists at apps/web/src/server/ws/handlers/admin.ts
  - [ ] WS server routes admin_run_result messages
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: No Anthropic imports remain
    Tool: Bash
    Steps:
      1. Run: grep -r "anthropic" apps/web/src/server/trpc/routers/admin.ts
    Expected Result: 0 matches (exit code 1)
    Evidence: .sisyphus/evidence/task-7-no-anthropic.txt

  Scenario: Typecheck passes after rewrite
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 pass, 0 errors
    Evidence: .sisyphus/evidence/task-7-typecheck.txt

  Scenario: New procedures exist
    Tool: Bash
    Steps:
      1. grep -n "submitTodos\|getTodos\|cancelTodo\|getOrchestratorStatus\|triggerOrchestration" apps/web/src/server/trpc/routers/admin.ts
    Expected Result: All 5 procedure names found
    Evidence: .sisyphus/evidence/task-7-procedures.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(admin): rewrite router — remove Anthropic API, add WS dispatch + admin_run_result handler`
  - Files: `apps/web/src/server/trpc/routers/admin.ts`, `apps/web/src/server/ws/handlers/admin.ts`, `apps/web/src/server/ws/server.ts`

---

- [x] 8. Daemon Handler for admin_run_command WS Messages

  **What to do**:
  - Create `apps/daemon/src/admin-handler.ts` with an `AdminCommandHandler` class:
    - Constructor takes `opencodeBin: string` (path to opencode binary)
    - Method: `async handleCommand(msg: AdminRunCommandMessage): Promise<AdminRunResultMessage>`
    - Implementation:
      1. Spawn `opencode run "<msg.command>"` using `Bun.spawn()` (follow pattern from `apps/daemon/src/task-runner.ts:114-139`)
      2. If `msg.projectPath` is provided, use it as `cwd`; otherwise use a default working directory
      3. Set a 5-minute timeout (`setTimeout` → kill process)
      4. Capture stdout as output
      5. Return `{ type: "admin_run_result", requestId: msg.requestId, deviceId: config.deviceId, output: stdout, exitCode: exitCode }`
      6. On error: return with `error: errorMessage, exitCode: 1, output: ""`

  - Update `apps/daemon/src/index.ts` to handle the new message type:
    - Add `case "admin_run_command":` in the switch statement (after "cancel_task" case, around line 87)
    - Import AdminCommandHandler
    - Initialize it alongside TaskRunner in main()
    - Route message to handler, send result back via `client.send()`

  **Must NOT do**:
  - Do NOT modify the existing task execution flow
  - Do NOT use any AI API directly — only spawn opencode CLI
  - Do NOT block other message handling while running admin command

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Daemon-side process spawning with timeout management
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T9)
  - **Blocks**: T12
  - **Blocked By**: None

  **References**:
  - `apps/daemon/src/task-runner.ts:110-140` — runOpenCode method pattern. Use same Bun.spawn() pattern for admin commands but WITHOUT session tracking/export
  - `apps/daemon/src/index.ts:24-94` — Message routing switch. Add admin_run_command case after cancel_task (line 87). Follow same async pattern
  - `packages/shared/src/ws-protocol/server-messages.ts:41-47` — AdminRunCommandMessage type: { type, requestId, command, projectPath?, sessionId? }
  - `packages/shared/src/ws-protocol/client-messages.ts:92-99` — AdminRunResultMessage type: { type, requestId, deviceId, output, exitCode, error? }
  - `apps/daemon/src/config.ts` — DaemonConfig with opencodeBin path
  - `apps/daemon/src/ws-client.ts:78-84` — CommandCenterClient.send() method for sending results back

  **Acceptance Criteria**:
  - [ ] `apps/daemon/src/admin-handler.ts` exists with AdminCommandHandler class
  - [ ] Spawns `opencode run` with 5-minute timeout
  - [ ] `apps/daemon/src/index.ts` routes `admin_run_command` messages to handler
  - [ ] Result sent back as `admin_run_result` ClientMessage
  - [ ] `bun run typecheck` passes (daemon package)

  **QA Scenarios**:
  ```
  Scenario: Typecheck passes with new handler
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-8-typecheck.txt

  Scenario: Handler file exists with correct class
    Tool: Bash
    Steps:
      1. grep -n "AdminCommandHandler\|handleCommand\|admin_run_command" apps/daemon/src/admin-handler.ts apps/daemon/src/index.ts
    Expected Result: Class definition in admin-handler.ts, case in index.ts
    Evidence: .sisyphus/evidence/task-8-handler.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(daemon): add admin_run_command handler with opencode run dispatch`
  - Files: `apps/daemon/src/admin-handler.ts`, `apps/daemon/src/index.ts`

---

- [x] 9. Session Title Display Throughout UI

  **What to do**:
  - Update `apps/web/src/components/sessions/SessionList.tsx`:
    - Currently shows `truncatePath(s.projectPath)` as the session label
    - Change to: show `s.title` if available, otherwise fall back to `truncatePath(s.projectPath)`
    - Display format: `s.title ?? truncatePath(s.projectPath)` 
    - Keep the path in the `title` attribute (tooltip) for hover

  - Update `apps/web/src/components/tasks/TaskCard.tsx`:
    - Currently shows `Session: {truncatePath(sessionPath)}` (line 125)
    - Add optional `sessionTitle?: string` prop to TaskCardProps
    - Display: `Session: {sessionTitle ?? truncatePath(sessionPath)}`

  - Update `apps/web/src/components/tasks/TaskCreateForm.tsx`:
    - Currently shows `{s.device.name} · {shortPath}` in session dropdown (line 146)
    - Change to: `{s.device.name} · {s.title ?? shortPath}` where title comes from the session record
    - The sessions query (trpcReact.sessions.list) already returns the Session model which now includes `title`

  - Also update `apps/web/src/server/ws/handlers/session.ts` handleSessionsDiscovered:
    - Currently does NOT save the `title` from the discovered session message
    - Add `title: sessionInfo.title` to both the create and update data objects
    - The SessionsDiscoveredMessage already has `title?: string` (added in Wave 1 T1)

  **Must NOT do**:
  - Do NOT add any new tRPC queries
  - Do NOT change session status logic
  - Do NOT modify the SessionList layout/structure beyond text changes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small text changes across 4 files
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T8)
  - **Blocks**: T10
  - **Blocked By**: None

  **References**:
  - `apps/web/src/components/sessions/SessionList.tsx:93` — Line that shows `truncatePath(s.projectPath)`. Change to `s.title ?? truncatePath(s.projectPath)`
  - `apps/web/src/components/tasks/TaskCard.tsx:35-44` — TaskCardProps interface. Add `sessionTitle?: string`
  - `apps/web/src/components/tasks/TaskCard.tsx:125` — `Session: {truncatePath(sessionPath)}`. Change to use sessionTitle
  - `apps/web/src/components/tasks/TaskCreateForm.tsx:146` — `{s.device.name} · {shortPath}`. Add title display
  - `apps/web/src/server/ws/handlers/session.ts:30-31,41-42` — Session create/update data objects. Add `title: sessionInfo.title`
  - `packages/shared/src/ws-protocol/client-messages.ts:67` — SessionsDiscoveredMessage already has `title?: string`
  - `apps/web/prisma/schema.prisma:104` — Session model has `title String?`

  **Acceptance Criteria**:
  - [ ] SessionList shows session title when available, path as fallback
  - [ ] TaskCard shows session title in assignment line
  - [ ] TaskCreateForm dropdown shows session title
  - [ ] handleSessionsDiscovered saves title to DB on create/update
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Session title saved from discovered sessions
    Tool: Bash
    Steps:
      1. grep -n "title.*sessionInfo\|sessionInfo.*title" apps/web/src/server/ws/handlers/session.ts
    Expected Result: title field included in create and update data
    Evidence: .sisyphus/evidence/task-9-title-save.txt

  Scenario: Typecheck passes
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-9-typecheck.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(ui): display session titles in SessionList, TaskCard, TaskCreateForm`
  - Files: `apps/web/src/components/sessions/SessionList.tsx`, `apps/web/src/components/tasks/TaskCard.tsx`, `apps/web/src/components/tasks/TaskCreateForm.tsx`, `apps/web/src/server/ws/handlers/session.ts`

---

### Wave 3

- [x] 10. Session Detail Page — /dashboard/sessions/[sessionId]

  **What to do**:
  - Create `apps/web/src/app/dashboard/sessions/[sessionId]/page.tsx`:
    - Server component that awaits params (Next.js 15 pattern: `params: Promise<{ sessionId: string }>`)
    - Renders `<SessionDetailView sessionId={sessionId} />`
    - Follow pattern from `apps/web/src/app/dashboard/[projectId]/page.tsx`

  - Create `apps/web/src/components/sessions/SessionDetailView.tsx`:
    - Client component ("use client")
    - Uses `trpcReact.sessions.getSessionDetail.useQuery({ id: sessionId })`
    - Uses `trpcReact.sessions.getSessionTasks.useQuery({ sessionId })`
    - Layout sections:
      1. **Header**: Session title (or path fallback), device name + status badge, connection status
      2. **Current Task**: If session has currentTask, show title, status badge, subTodos checklist, result summary
      3. **Task History**: List of all tasks assigned to this session (from getSessionTasks)
      4. **Admin Todos**: List of AdminTodos assigned to this session with status badges
      5. **Actions**: Delete session button (calls sessions.delete mutation)
    - Status badge colors: same as SessionList (IDLE=#22c55e, BUSY=#6366f1, DEAD=#ef4444, DISCOVERED=#6b7280)
    - Dark theme inline styles matching existing components
    - Add SSE listener for real-time updates (session_status_changed, task_status_changed, admin_todo_status_changed)

  - Update `apps/web/src/components/sessions/SessionList.tsx`:
    - Make session items clickable — wrap in `<Link href="/dashboard/sessions/{s.id}">`
    - Keep existing layout, just add navigation

  **Must NOT do**:
  - Do NOT use shadcn/ui
  - Do NOT use synchronous params access
  - Do NOT add new tRPC procedures (use the ones from T6)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Full page creation with complex layout
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12, T13)
  - **Blocks**: F3
  - **Blocked By**: T5, T6, T9

  **References**:
  - `apps/web/src/app/dashboard/[projectId]/page.tsx` — Pattern for Next.js 15 dynamic route with Promise params. Copy this pattern exactly
  - `apps/web/src/app/dashboard/[projectId]/ProjectPageClient.tsx` — Pattern for client component receiving projectId prop
  - `apps/web/src/components/sessions/SessionList.tsx` — Add Link wrapping to each session item. Existing status color map to reuse
  - `apps/web/src/server/trpc/routers/sessions.ts` — getSessionDetail and getSessionTasks queries (from T6)
  - `apps/web/src/components/tasks/TaskCard.tsx` — Task display pattern with status badge, subtodos, result
  - `apps/web/src/hooks/useSSE.ts` — SSE hook for real-time updates
  - `packages/shared/src/ws-protocol/dashboard-events.ts` — DashboardEvent types for SSE filtering
  - `apps/web/prisma/schema.prisma:143-169` — AdminTodo model fields for display

  **Acceptance Criteria**:
  - [ ] Route /dashboard/sessions/[sessionId] exists and renders
  - [ ] Page shows session title, device info, current task, task history, admin todos
  - [ ] SessionList items are clickable links to detail page
  - [ ] SSE updates refresh data in real-time
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Session detail page renders
    Tool: Playwright
    Steps:
      1. Navigate to /dashboard/sessions/{sessionId}
      2. Verify page contains session info section
      3. Verify page contains task history section
    Expected Result: Page renders without errors
    Evidence: .sisyphus/evidence/task-10-session-detail.png

  Scenario: Typecheck passes
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-10-typecheck.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(sessions): add session detail page with task history and admin todos`
  - Files: `apps/web/src/app/dashboard/sessions/[sessionId]/page.tsx`, `apps/web/src/components/sessions/SessionDetailView.tsx`, `apps/web/src/components/sessions/SessionList.tsx`

---

- [x] 11. AdminTodoPanel — Natural Language Todo Input + Status Display

  **What to do**:
  - Create `apps/web/src/components/admin/AdminTodoPanel.tsx` to REPLACE the existing `AdminPanel.tsx`
  - The new panel combines system status (from old AdminPanel) with todo management

  - Layout:
    1. **Header row**: "🤖 Admin Agent" label + system status summary (online devices, running tasks, pending tasks) — reuse from current AdminPanel
    2. **Todo input**: Textarea + "Submit" button. User types natural language todos (one per line or freeform). Calls `admin.submitTodos` mutation
    3. **Orchestrate button**: "▶ Run Orchestration" button that calls `admin.triggerOrchestration`. Disabled when no PENDING todos exist
    4. **Todo list**: Shows all AdminTodos from `admin.getTodos` query, grouped by status:
       - PENDING (gray) — waiting to be converted
       - CONVERTING (yellow/amber, pulsing) — being processed by opencode run
       - READY (blue) — converted, waiting for assignment
       - ASSIGNED (indigo) — sent to a worker session
       - VERIFYING (purple) — admin checking the output
       - DONE (green) — verified complete
       - FAILED (red) — failed after max retries
       - CANCELLED (gray, muted) — user cancelled
    5. Each todo item shows: content, status badge, convertedInstruction (if READY+), assignedSessionId (if ASSIGNED+), retryCount/maxRetries (if VERIFYING/FAILED), cancel button (for PENDING/READY only)

  - SSE integration: Listen for `admin_todo_status_changed`, `admin_orchestrator_status`, `admin_verification_result`, `admin_todo_escalated` events → invalidate getTodos query

  - Update `apps/web/src/app/dashboard/[projectId]/ProjectPageClient.tsx` or the dashboard layout to include AdminTodoPanel (replace AdminPanel import)

  **Must NOT do**:
  - Do NOT use shadcn/ui
  - Do NOT make per-todo API calls for conversion (that's T12's job via batch)
  - Do NOT implement actual orchestration logic here (that's T12)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex interactive panel with status management
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T12, T13)
  - **Blocks**: T12
  - **Blocked By**: T7

  **References**:
  - `apps/web/src/components/admin/AdminPanel.tsx` — Current admin panel. Reuse system status display pattern (device grid, health report). REPLACE this component
  - `apps/web/src/server/trpc/routers/admin.ts` — After T7 rewrite: submitTodos, getTodos, cancelTodo, getOrchestratorStatus, triggerOrchestration procedures
  - `packages/shared/src/types/admin.ts` — AdminTodoStatus type for status badge colors
  - `packages/shared/src/ws-protocol/dashboard-events.ts:50-78` — 4 admin event types for SSE
  - `apps/web/src/hooks/useSSE.ts` — SSE hook pattern
  - `apps/web/src/components/tasks/TaskCard.tsx` — Status badge pattern (StatusBadge component). Use similar pill-shaped badges for AdminTodoStatus
  - `apps/web/src/app/dashboard/[projectId]/ProjectPageClient.tsx` — Currently imports AdminPanel. Update to import AdminTodoPanel

  **Acceptance Criteria**:
  - [ ] AdminTodoPanel component exists with todo input textarea
  - [ ] Displays AdminTodos grouped by status with correct color coding
  - [ ] Submit button calls admin.submitTodos
  - [ ] Orchestrate button calls admin.triggerOrchestration
  - [ ] SSE events trigger data refresh
  - [ ] Old AdminPanel.tsx can be removed or is replaced
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: AdminTodoPanel renders with input
    Tool: Playwright
    Steps:
      1. Navigate to dashboard
      2. Find admin panel section
      3. Verify textarea input exists
      4. Verify "Submit" button exists
      5. Verify "Run Orchestration" button exists
    Expected Result: All UI elements present
    Evidence: .sisyphus/evidence/task-11-admin-panel.png

  Scenario: Typecheck passes
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-11-typecheck.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(admin): AdminTodoPanel with natural language input and status display`
  - Files: `apps/web/src/components/admin/AdminTodoPanel.tsx`, `apps/web/src/components/admin/AdminPanel.tsx` (delete or keep for reference), layout file that imports it

---

- [x] 12. Batch Todo→Instruction Conversion via OpenCode Run

  **What to do**:
  - Create `apps/web/src/server/admin-orchestrator.ts` with an `AdminOrchestrator` class:
    - This is the server-side engine that drives the admin workflow
    - Method: `async convertPendingTodos(): Promise<void>`
      1. Query `db.adminTodo.findMany({ where: { status: "PENDING" }, take: 5, orderBy: { createdAt: "asc" } })`
      2. If none found, return
      3. Update all to status "CONVERTING"
      4. Build a batch prompt string:
         ```
         Convert the following natural language tasks into precise, actionable coding instructions.
         For each task, provide a clear title and detailed step-by-step instructions that a coding AI can follow.
         
         Tasks:
         1. [todo.content]
         2. [todo.content]
         ...
         
         Respond in this JSON format:
         [{ "todoId": "...", "title": "...", "instruction": "..." }, ...]
         ```
      5. Find a connected device via `agentRegistry.getAll()[0]`
      6. If no device connected, set todos back to PENDING and return
      7. Generate a `requestId` via `crypto.randomUUID()`
      8. Send `admin_run_command` WS message to daemon: `{ type: "admin_run_command", requestId, command: prompt }`
      9. Store the requestId→todoIds mapping in a Map for later resolution (when admin_run_result arrives)
      10. Broadcast SSE: `admin_orchestrator_status` with `isProcessing: true`

  - Update `apps/web/src/server/ws/handlers/admin.ts` (created in T7):
    - When `admin_run_result` message arrives:
      1. Look up the requestId in the orchestrator's pending map
      2. Parse the output as JSON (try/catch — if not valid JSON, mark todos as FAILED)
      3. For each parsed instruction, update the corresponding AdminTodo:
         - Set `convertedInstruction` to the instruction text
         - Set `status` to "READY"
      4. Broadcast SSE `admin_todo_status_changed` for each updated todo
      5. Broadcast SSE `admin_orchestrator_status` with `isProcessing: false`

  - Wire the `triggerOrchestration` mutation (from T7) to call `orchestrator.convertPendingTodos()`

  **Must NOT do**:
  - Do NOT make per-todo conversion calls (batch up to 5)
  - Do NOT call any external AI API directly
  - Do NOT block the server — conversion is async via WS

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex async orchestration with WS message correlation and JSON parsing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T7, T8, T11)
  - **Parallel Group**: Wave 3 (sequential within wave)
  - **Blocks**: T13
  - **Blocked By**: T7, T8, T11

  **References**:
  - `apps/web/src/server/trpc/routers/admin.ts` — triggerOrchestration mutation (from T7). Wire to orchestrator.convertPendingTodos()
  - `apps/web/src/server/ws/handlers/admin.ts` — admin_run_result handler (from T7). Extend to resolve pending conversions
  - `apps/web/src/server/ws/registry.ts` — agentRegistry for finding connected devices
  - `apps/web/src/server/ws/sse.ts` — sseBroadcaster for admin events
  - `apps/web/src/server/ws/dispatcher.ts` — Pattern for WS dispatch + Prisma updates
  - `packages/shared/src/ws-protocol/server-messages.ts:41-47` — AdminRunCommandMessage
  - `packages/shared/src/ws-protocol/client-messages.ts:92-99` — AdminRunResultMessage
  - `packages/shared/src/ws-protocol/dashboard-events.ts:50-64` — admin_todo_status_changed, admin_orchestrator_status events
  - `apps/web/prisma/schema.prisma:154-169` — AdminTodo model with convertedInstruction, status fields

  **Acceptance Criteria**:
  - [ ] AdminOrchestrator class exists with convertPendingTodos method
  - [ ] Batches up to 5 PENDING todos per conversion call
  - [ ] Sends admin_run_command WS message with batch prompt
  - [ ] admin_run_result handler parses JSON and updates AdminTodo records
  - [ ] SSE events broadcast on status changes
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Orchestrator module exists with correct exports
    Tool: Bash
    Steps:
      1. grep -n "AdminOrchestrator\|convertPendingTodos" apps/web/src/server/admin-orchestrator.ts
    Expected Result: Class and method found
    Evidence: .sisyphus/evidence/task-12-orchestrator.txt

  Scenario: Typecheck passes
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-12-typecheck.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(admin): batch todo→instruction conversion via opencode run`
  - Files: `apps/web/src/server/admin-orchestrator.ts`, `apps/web/src/server/ws/handlers/admin.ts`, `apps/web/src/server/trpc/routers/admin.ts`

---

- [x] 13. Auto-Assignment of Converted Instructions to Idle Worker Sessions

  **What to do**:
  - Add method to `apps/web/src/server/admin-orchestrator.ts`:
    - `async assignReadyTodos(): Promise<void>`
      1. Query `db.adminTodo.findMany({ where: { status: "READY" }, orderBy: { createdAt: "asc" } })`
      2. Query `db.session.findMany({ where: { status: "IDLE" } })` — get idle sessions
      3. For each READY todo (up to number of idle sessions):
         a. Pick an idle session (round-robin or first available)
         b. Update AdminTodo: `status: "ASSIGNED", assignedSessionId: session.id, assignedDeviceId: session.deviceId`
         c. Create a Task in the project matching the session's projectPath:
            - Find project: `db.project.findFirst({ where: { deviceId: session.deviceId, path: session.projectPath } })`
            - Create task: `db.task.create({ data: { projectId, title: todo.convertedInstruction title, description: todo.convertedInstruction, status: "PENDING" } })`
         d. Use existing `dispatchToSession(session.id)` to assign the task to the session via WS
         e. Broadcast SSE `admin_todo_status_changed` with assignedSessionId
      4. If no idle sessions, do nothing (todos stay READY for next cycle)

  - Wire into orchestrator flow:
    - After conversion completes (admin_run_result handler marks todos as READY), automatically call `assignReadyTodos()`
    - Also wire `triggerOrchestration` to call both `convertPendingTodos()` AND `assignReadyTodos()` sequentially

  **Must NOT do**:
  - Do NOT assign to BUSY sessions
  - Do NOT create duplicate tasks for already-assigned todos
  - Do NOT bypass the existing task dispatch system (use dispatchToSession)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration of admin todos with existing task dispatch system
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after T12)
  - **Blocks**: T14
  - **Blocked By**: T12

  **References**:
  - `apps/web/src/server/admin-orchestrator.ts` — Add assignReadyTodos method (from T12)
  - `apps/web/src/server/ws/dispatcher.ts:5-74` — dispatchToSession function. Reuse for actual WS dispatch after task creation
  - `apps/web/prisma/schema.prisma:73-95` — Task model for creating tasks from converted instructions
  - `apps/web/prisma/schema.prisma:154-169` — AdminTodo with assignedSessionId, assignedDeviceId
  - `apps/web/src/server/trpc/routers/tasks.ts:49-70` — Task creation pattern with auto-position
  - `apps/web/src/server/ws/sse.ts` — SSE broadcaster
  - `packages/shared/src/ws-protocol/dashboard-events.ts:50-57` — admin_todo_status_changed with assignedSessionId

  **Acceptance Criteria**:
  - [ ] assignReadyTodos method exists in AdminOrchestrator
  - [ ] Creates Task records from converted instructions
  - [ ] Dispatches to idle sessions via existing dispatchToSession
  - [ ] Updates AdminTodo status to ASSIGNED with session info
  - [ ] Broadcasts SSE events
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Auto-assignment method exists
    Tool: Bash
    Steps:
      1. grep -n "assignReadyTodos\|dispatchToSession" apps/web/src/server/admin-orchestrator.ts
    Expected Result: Method and dispatch import found
    Evidence: .sisyphus/evidence/task-13-assignment.txt

  Scenario: Typecheck passes
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-13-typecheck.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(admin): auto-assign converted instructions to idle worker sessions`
  - Files: `apps/web/src/server/admin-orchestrator.ts`, `apps/web/src/server/ws/handlers/admin.ts`

---

### Wave 4

- [x] 14. Admin Verification Loop (3 Retry Max)

  **What to do**:
  - Add method to `apps/web/src/server/admin-orchestrator.ts`:
    - `async verifyCompletedTodos(): Promise<void>`
      1. Find AdminTodos with status "ASSIGNED" that have completed tasks:
         - Join: find tasks where `status: "DONE"` and `sessionId` matches an AdminTodo's `assignedSessionId`
         - Or: listen for `task_completed` events and cross-reference with AdminTodo records
      2. For each completed todo:
         a. Update status to "VERIFYING"
         b. Get the TaskResult (summary, filesChanged)
         c. Build a verification prompt:
            ```
            Verify this task completion:
            
            Original request: [todo.content]
            Instruction given: [todo.convertedInstruction]
            
            Worker's summary: [taskResult.summary]
            Files changed: [taskResult.filesChanged]
            
            Does the work match the request? Check:
            1. All requirements addressed?
            2. No obvious errors or omissions?
            3. Files changed make sense for the task?
            
            Respond with JSON: { "passed": true/false, "feedback": "...", "corrections": "..." }
            ```
         d. Send `admin_run_command` to daemon with this verification prompt
         e. Store requestId→todoId mapping for result resolution

  - Handle verification result (in admin_run_result handler):
    - Parse JSON response
    - If `passed: true`:
      - Update AdminTodo status to "DONE", set `completedAt`
      - Broadcast `admin_verification_result` SSE event
    - If `passed: false` AND `retryCount < maxRetries` (3):
      - Increment `retryCount`
      - Send correction prompt to the same worker session via `admin_run_command`
      - Keep status as "VERIFYING"
      - Broadcast `admin_verification_result` with feedback
    - If `passed: false` AND `retryCount >= maxRetries`:
      - Update status to "FAILED"
      - Set `verificationNotes` with feedback
      - Broadcast `admin_todo_escalated` SSE event

  - Integrate with task_completed WS handler (`apps/web/src/server/ws/handlers/task-result.ts`):
    - After a task completes, check if it's associated with an AdminTodo
    - If so, trigger verification automatically

  **Must NOT do**:
  - Do NOT allow more than 3 retries (hard cap: `maxRetries` field in AdminTodo, default 3)
  - Do NOT block on verification — it's async
  - Do NOT use any external AI API — only opencode run via WS

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex async verification loop with state machine logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (first in sequence)
  - **Blocks**: T15
  - **Blocked By**: T13

  **References**:
  - `apps/web/src/server/admin-orchestrator.ts` — Add verifyCompletedTodos method
  - `apps/web/src/server/ws/handlers/admin.ts` — Extend admin_run_result to handle verification results
  - `apps/web/src/server/ws/handlers/task-result.ts` — handleTaskCompleted function. Add AdminTodo cross-reference check
  - `apps/web/prisma/schema.prisma:154-169` — AdminTodo with retryCount, maxRetries, verificationNotes, completedAt
  - `packages/shared/src/ws-protocol/dashboard-events.ts:66-78` — admin_verification_result, admin_todo_escalated events
  - `apps/web/src/server/ws/sse.ts` — SSE broadcaster

  **Acceptance Criteria**:
  - [ ] verifyCompletedTodos method exists
  - [ ] Verification auto-triggers when assigned todo's task completes
  - [ ] Passed verification sets todo to DONE
  - [ ] Failed verification retries up to 3 times
  - [ ] After 3 failures, todo set to FAILED with escalation event
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Verification loop with retry logic
    Tool: Bash
    Steps:
      1. grep -n "verifyCompletedTodos\|retryCount\|maxRetries\|FAILED\|DONE" apps/web/src/server/admin-orchestrator.ts
    Expected Result: All verification logic present
    Evidence: .sisyphus/evidence/task-14-verification.txt

  Scenario: Typecheck passes
    Tool: Bash
    Steps:
      1. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-14-typecheck.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `feat(admin): verification loop with 3-retry cap and escalation`
  - Files: `apps/web/src/server/admin-orchestrator.ts`, `apps/web/src/server/ws/handlers/admin.ts`, `apps/web/src/server/ws/handlers/task-result.ts`

---

- [x] 15. SSE Events for Admin Orchestrator

  **What to do**:
  - Ensure all admin orchestrator state changes broadcast SSE events to the dashboard
  - The event types are already defined in `packages/shared/src/ws-protocol/dashboard-events.ts` (added in Wave 1 T1):
    - `admin_todo_status_changed` — when any AdminTodo changes status
    - `admin_orchestrator_status` — when orchestrator starts/stops processing
    - `admin_verification_result` — when verification completes (pass or fail)
    - `admin_todo_escalated` — when todo fails max retries
  - Verify that T7, T12, T13, T14 all broadcast these events correctly via `sseBroadcaster.broadcast()`
  - If any are missing, add them
  - Update `apps/web/src/hooks/useSSE.ts` if needed to handle new event types (should already work since DashboardEvent type includes them)
  - Update `apps/web/src/components/admin/AdminTodoPanel.tsx` (from T11) to invalidate queries on receiving these SSE events

  **Must NOT do**:
  - Do NOT add new event types (they already exist)
  - Do NOT modify the SSEBroadcaster class itself

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification and gap-filling of SSE integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after T14)
  - **Blocks**: T16
  - **Blocked By**: T7, T14

  **References**:
  - `apps/web/src/server/ws/sse.ts` — sseBroadcaster singleton
  - `packages/shared/src/ws-protocol/dashboard-events.ts:50-78` — 4 admin event types
  - `apps/web/src/server/admin-orchestrator.ts` — Verify all state changes broadcast SSE
  - `apps/web/src/server/ws/handlers/admin.ts` — Verify SSE on admin_run_result
  - `apps/web/src/components/admin/AdminTodoPanel.tsx` — Verify SSE listener invalidates queries
  - `apps/web/src/hooks/useSSE.ts` — SSE hook

  **Acceptance Criteria**:
  - [ ] All 4 admin SSE event types are broadcast at appropriate state transitions
  - [ ] AdminTodoPanel refreshes on SSE events
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: SSE events broadcast from orchestrator
    Tool: Bash
    Steps:
      1. grep -rn "admin_todo_status_changed\|admin_orchestrator_status\|admin_verification_result\|admin_todo_escalated" apps/web/src/server/
    Expected Result: All 4 event types found in broadcast calls
    Evidence: .sisyphus/evidence/task-15-sse-events.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `fix(admin): ensure all SSE events fire for orchestrator state changes`
  - Files: Various (depends on gaps found)

---

- [x] 16. Cleanup — Remove ALL Anthropic API References

  **What to do**:
  - Search entire codebase for any remaining references to `@anthropic-ai/sdk`, `anthropic`, `ANTHROPIC_API_KEY`
  - Remove from:
    - `package.json` dependencies (if still present)
    - `.env` or `.env.example` files
    - Any import statements
    - Any environment variable references
  - Run: `grep -r "anthropic" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.env*" .`
  - Clean up any dead code left over from the old reviewTask mutation

  **Must NOT do**:
  - Do NOT remove actual functionality — only dead Anthropic references
  - Do NOT touch node_modules

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Search and delete
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after T15)
  - **Blocks**: T17
  - **Blocked By**: T15

  **References**:
  - `apps/web/package.json` — Check for @anthropic-ai/sdk in dependencies
  - `apps/web/src/server/trpc/routers/admin.ts` — Should already be clean from T7, but verify
  - `.env*` files — Remove ANTHROPIC_API_KEY if present

  **Acceptance Criteria**:
  - [ ] `grep -r "anthropic" . --include="*.ts" --include="*.tsx"` returns 0 matches (excluding node_modules)
  - [ ] `grep -r "@anthropic-ai/sdk" . --include="*.json"` returns 0 matches (excluding node_modules)
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: No Anthropic references remain
    Tool: Bash
    Steps:
      1. grep -r "anthropic" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.env*" apps/ packages/
    Expected Result: 0 matches
    Evidence: .sisyphus/evidence/task-16-no-anthropic.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `chore: remove all Anthropic API references`
  - Files: Various

---

- [x] 17. Full Typecheck + Final Verification Pass

  **What to do**:
  - Run `bun run typecheck` and fix any remaining type errors
  - Run `bun install` to ensure all dependencies are resolved (especially after removing @anthropic-ai/sdk)
  - Verify all files compile cleanly:
    - `packages/shared` (tsc --noEmit)
    - `apps/web` (tsc --noEmit)
    - `apps/daemon` (tsc --noEmit)
  - Fix any import errors, missing types, or stale references
  - Verify the dev server starts: `bun run dev` (apps/web)

  **Must NOT do**:
  - Do NOT add `@ts-ignore` or `as any` to fix errors — fix them properly
  - Do NOT change functionality to fix types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Run commands, fix errors
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (last task)
  - **Blocks**: F1-F4
  - **Blocked By**: T16

  **References**:
  - Root `package.json` — turbo typecheck script
  - `apps/web/tsconfig.json`, `apps/daemon/tsconfig.json`, `packages/shared/tsconfig.json`

  **Acceptance Criteria**:
  - [ ] `bun run typecheck` → 4/4 packages, 0 errors
  - [ ] No `@ts-ignore` or `as any` added
  - [ ] `bun install` succeeds without errors

  **QA Scenarios**:
  ```
  Scenario: Full typecheck passes
    Tool: Bash
    Steps:
      1. Run: bun install
      2. Run: bun run typecheck
    Expected Result: 4/4 packages pass, 0 errors
    Evidence: .sisyphus/evidence/task-17-typecheck.txt
  ```

  **Commit**: YES
  - Message: `chore: final typecheck pass — 0 errors`
  - Files: Various (any files fixed)
