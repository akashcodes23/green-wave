"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { ROUTES } from "@/lib/routes";

const TOTAL    = 140;
const PRE_CLEAR = 20;

function getSignalState(idx, step, total, signalCount) {
  const arrival = Math.round((idx / (signalCount - 1)) * total);
  const pre     = arrival - PRE_CLEAR;
  const revert  = arrival + 22;
  if (step >= pre && step < revert) return "green";
  if (step >= revert)               return "done";
  return "red";
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Simulate vehicle position along a straight line origin→destination
function getVehiclePos(step, total, origin, destination) {
  const t = Math.min(step / total, 1.0);
  return {
    lat: lerp(origin.lat, destination.lat, t),
    lng: lerp(origin.lng, destination.lng, t),
  };
}

// Generate N evenly spaced synthetic signal names between origin and destination
function buildSignals(origin, destination, count = 7) {
  const names = [
    "Signal 1", "Signal 2", "Signal 3", "Signal 4",
    "Signal 5", "Signal 6", "Signal 7",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: names[i] || `Signal ${i + 1}`,
    state: "red",
    corridor_active: false,
  }));
}

export function useMultiAmbulance() {
  const [ambulances, setAmbulances] = useState({});
  const intervalsRef = useRef({});
  const counterRef   = useRef(0);

  const dispatch = useCallback((routeKey) => {
    const id    = `AMB-${String(++counterRef.current).padStart(2, "0")}`;
    const route = ROUTES[routeKey];
    const signals = buildSignals(route.origin, route.destination);

    setAmbulances(prev => ({
      ...prev,
      [id]: {
        id, routeKey, route,
        step: 0, running: true, arrived: false,
        signals,
        vehicle: { lat: route.origin.lat, lng: route.origin.lng, speed: 60 },
        eta: route.etaStart || 480, time_saved: 0, progress: 0,
      },
    }));

    intervalsRef.current[id] = setInterval(() => {
      setAmbulances(prev => {
        const amb = prev[id];
        if (!amb || !amb.running || amb.arrived) return prev;

        const nextStep = amb.step + 1;
        const arrived  = nextStep >= TOTAL;
        const progress = Math.round(Math.min(nextStep / TOTAL, 1) * 100);
        const eta      = Math.max(0, Math.round((1 - nextStep / TOTAL) * (route.etaStart || 480)));
        const saved    = Math.round((nextStep / TOTAL) * (route.timeSaved || 280));
        const vpos     = getVehiclePos(nextStep, TOTAL, route.origin, route.destination);
        const speed    = 55 + Math.sin(nextStep * 0.3) * 12 + (nextStep / TOTAL) * 8;

        const updatedSignals = amb.signals.map((sig, i) => {
          const state = arrived ? "done" : getSignalState(i, nextStep, TOTAL, amb.signals.length);
          return { ...sig, state, corridor_active: state === "green" };
        });

        return {
          ...prev,
          [id]: {
            ...amb,
            step: nextStep, arrived, running: !arrived,
            progress, eta, time_saved: saved,
            vehicle: { lat: vpos.lat, lng: vpos.lng, speed: Math.round(speed) },
            signals: updatedSignals,
          },
        };
      });
    }, 110);

    return id;
  }, []);

  const removeAmbulance = useCallback((id) => {
    clearInterval(intervalsRef.current[id]);
    delete intervalsRef.current[id];
    setAmbulances(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const resetAll = useCallback(() => {
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};
    counterRef.current   = 0;
    setAmbulances({});
  }, []);

  useEffect(() => () => Object.values(intervalsRef.current).forEach(clearInterval), []);

  return { ambulances, dispatch, removeAmbulance, resetAll };
}