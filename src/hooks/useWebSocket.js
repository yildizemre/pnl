import { useEffect, useRef } from "react";
import { wsUrl } from "../api";

export function useWebSocket(onMessage, enabled = true) {
  const cb = useRef(onMessage);
  cb.current = onMessage;

  useEffect(() => {
    if (!enabled || !localStorage.getItem("hv_token")) return undefined;

    let ws = null;
    let reconnectTimer = null;
    let connectTimer = null;
    let closed = false;
    let gen = 0;

    const connect = () => {
      if (closed) return;
      const myGen = ++gen;
      let socket;
      try {
        socket = new WebSocket(wsUrl());
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
        return;
      }
      ws = socket;

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          cb.current?.(data);
        } catch {
          /* ignore */
        }
      };

      socket.onopen = () => {
        if (closed || myGen !== gen) return;
      };

      socket.onclose = () => {
        if (!closed && myGen === gen) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      };

      socket.onerror = () => {
        if (closed || myGen !== gen) return;
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.close();
          } catch {
            /* ignore */
          }
        }
      };
    };

    connectTimer = setTimeout(connect, 150);

    return () => {
      closed = true;
      gen += 1;
      clearTimeout(reconnectTimer);
      clearTimeout(connectTimer);
      const socket = ws;
      ws = null;
      if (socket) {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.close();
          } catch {
            /* ignore */
          }
        }
      }
    };
  }, [enabled]);

  return null;
}
