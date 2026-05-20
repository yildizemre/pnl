import { useEffect, useRef } from "react";
import { wsUrl } from "../api";

export function useWebSocket(onMessage, enabled = true) {
  const cb = useRef(onMessage);
  cb.current = onMessage;

  useEffect(() => {
    if (!enabled || !localStorage.getItem("hv_token")) return;

    let ws;
    let timer;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl());
      } catch {
        timer = setTimeout(connect, 5000);
        return;
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          cb.current?.(data);
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        if (!closed) timer = setTimeout(connect, 4000);
      };

      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [enabled]);
}
