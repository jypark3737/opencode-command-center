import { Sidebar } from "@/components/layout/Sidebar";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <AdminPanel />
      </main>
    </div>
  );
}
