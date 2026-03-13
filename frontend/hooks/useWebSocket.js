"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live";

export function useWebSocket() {
  const [snapshot,  setSnapshot]  = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef      = useRef(null);
  const retryRef   = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mountedRef.current) setConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (mountedRef.current) setSnapshot(data);
        } catch (_) {}
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        // Reconnect after 3s
        retryRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
      };
    } catch (_) {
      setConnected(false);
      retryRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { snapshot, connected, send };
}