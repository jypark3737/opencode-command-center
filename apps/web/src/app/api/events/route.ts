import { sseBroadcaster } from "@/server/ws/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Check API key
  const apiKey =
    req.headers.get("x-api-key") ??
    new URL(req.url).searchParams.get("apiKey");

  const validKey = process.env.COMMAND_CENTER_API_KEY;
  if (validKey && apiKey !== validKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      sseBroadcaster.addClient(controller);

      // Send initial ping
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": ping\n\n"));
    },
    cancel() {
      sseBroadcaster.removeClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
