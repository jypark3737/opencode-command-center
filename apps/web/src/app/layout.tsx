import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCode Terminal Hub",
  description: "OpenCode Terminal Hub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0a0a0a", color: "#ededed" }}>
        {children}
      </body>
    </html>
  );
}
