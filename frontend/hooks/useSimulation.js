"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ROUTES } from "@/lib/routes";

const WS_URL  = "ws://localhost:8000/ws/live";
const API_URL = "http://localhost:8000";

export function useSimulation(selectedRoute = "route1") {
  const [snapshot,   setSnapshot]   = useState(null);
  const [logs,       setLogs]       = useState([]);
  const [dispatched, setDispatched] = useState(false);
  const [connected,  setConnected]  = useState(false);

  const wsRef    = useRef(null);
  const prevStep = useRef(-1);
  const route    = ROUTES[selectedRoute];

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen  = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setSnapshot(data);

        if (data.step !== prevStep.current) {
          data.signals?.forEach((sig, i) => {
            const wp = route?.waypoints[i];
            if (sig.state === "green" && prevStep.current >= 0 && wp) {
              setLogs(l => [...l.slice(-60), {
                text: `▶ PRE-CLEAR: ${wp.name}`,
                type: "green",
              }]);
            }
          });
          if (data.arrived && prevStep.current < data.step) {
            setLogs(l => [...l.slice(-60), {
              text: `🏥 ARRIVED — ${route?.destination?.name ?? "Hospital"}`,
              type: "green",
            }]);
          }
          prevStep.current = data.step;
        }
      };
    }

    connect();
    return () => wsRef.current?.close();
  }, [selectedRoute]);

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const dispatch = useCallback(async () => {
    const r = ROUTES[selectedRoute];
    try {
      await fetch(`${API_URL}/dispatch`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          origin:      r.origin.name,
          destination: r.destination.name,
          route_key:   selectedRoute,
        }),
      });
      setDispatched(true);
      setLogs([
        { text: `🚨 EMERGENCY DISPATCH — ${r.origin.name}`, type: "alert" },
        { text: `▸ ROUTE: ${r.name}`,                        type: "info"  },
        { text: `▸ ${r.waypoints.length} signal nodes loaded`, type: "info"  },
        { text: `▸ AI corridor model activated`,              type: "info"  },
      ]);
      prevStep.current = -1;
    } catch (err) {
      // Backend not running — run in standalone mode
      console.warn("Backend unavailable — running standalone simulation");
      setDispatched(true);
      setLogs([
        { text: `🚨 EMERGENCY — ${r.origin.name}`, type: "alert" },
        { text: `▸ STANDALONE MODE (no backend)`,  type: "info"  },
      ]);
      prevStep.current = -1;
    }
  }, [selectedRoute]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(async () => {
    try {
      await fetch(`${API_URL}/simulation/reset`, { method: "POST" });
    } catch (_) {}
    setDispatched(false);
    setSnapshot(null);
    setLogs([]);
    prevStep.current = -1;
  }, []);

  return {
    snapshot,
    logs,
    dispatched,
    connected,
    dispatch,
    reset,
    arrived: snapshot?.arrived ?? false,
    step:    snapshot?.step    ?? 0,
  };
}