import type { SubTodoUpdate } from "@opencode-cc/shared";

interface SubTodoListProps {
  subTodos: SubTodoUpdate[];
}

export function SubTodoList({ subTodos }: SubTodoListProps) {
  if (subTodos.length === 0) return null;

  return (
    <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
      {subTodos.map((todo, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "3px 0",
            fontSize: 12,
            color: todo.checked ? "#555" : "#aaa",
          }}
        >
          <span style={{ marginTop: 1, flexShrink: 0 }}>
            {todo.checked ? "✅" : "⬜"}
          </span>
          <span style={{ textDecoration: todo.checked ? "line-through" : "none" }}>
            {todo.content}
          </span>
        </li>
      ))}
    </ul>
  );
}
