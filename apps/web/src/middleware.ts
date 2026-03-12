import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const password = process.env.HUB_PASSWORD;
  if (!password) return NextResponse.next();

  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const colonIdx = decoded.indexOf(":");
      const pass = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded;
      if (pass === password) return NextResponse.next();
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="OpenCode Terminal Hub"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
