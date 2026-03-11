
## Task 8: Pre-existing web typecheck errors
- `@opencode-cc/web` has 2 pre-existing TS errors (TaskCard.tsx:126 sessionTitle, TaskList.tsx:35 reviewTask)
- These prevent 4/4 clean typecheck but are unrelated to daemon changes
- `@opencode-cc/daemon` and `@opencode-cc/shared` typecheck clean