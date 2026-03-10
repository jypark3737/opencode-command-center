import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc-client";

export const metadata: Metadata = {
  title: "OpenCode Command Center",
  description: "Manage your OpenCode sessions across all devices",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0a0a0a", color: "#ededed" }}>
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </body>
    </html>
  );
}
