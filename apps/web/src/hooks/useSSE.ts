"use client";

import { useEffect, useCallback } from "react";
import type { DashboardEvent } from "@opencode-cc/shared";

export function useSSE(onEvent: (event: DashboardEvent) => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableOnEvent = useCallback(onEvent, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? "";
    const url = `/api/events?apiKey=${encodeURIComponent(apiKey)}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as DashboardEvent;
        stableOnEvent(event);
      } catch {
        // ignore parse errors (e.g. ping)
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => es.close();
  }, [stableOnEvent]);
}
