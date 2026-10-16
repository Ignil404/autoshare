import { useEffect, useRef, useCallback } from "react";

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      logger.log("WS connected");
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== "pong") onMessage(msg);
      } catch {}
    };

    ws.onclose = () => {
      logger.log("WS disconnected, reconnecting in 3s...");
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [onMessage]);

  useEffect(() => {
    connect();
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}

const logger = { log: (...args: unknown[]) => {} };
