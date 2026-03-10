"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpcReact } from "@/lib/trpc-client";

export function ProjectList() {
  const pathname = usePathname();
  const { data: projects, isLoading } = trpcReact.projects.list.useQuery();

  if (isLoading) {
    return <div style={{ padding: "4px 8px", fontSize: 12, color: "#555" }}>Loading...</div>;
  }

  const projectList = projects ?? [];

  if (projectList.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "#555", padding: "4px 8px", margin: 0 }}>
        No projects yet
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {projectList.map((p) => {
        const isActive = pathname === `/dashboard/${p.id}`;
        return (
          <li key={p.id}>
            <Link
              href={`/dashboard/${p.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 13,
                textDecoration: "none",
                background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                color: isActive ? "#a5b4fc" : "#ccc",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
              {(p._count?.tasks ?? 0) > 0 && (
                <span style={{ fontSize: 10, color: "#555" }}>{p._count?.tasks}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
