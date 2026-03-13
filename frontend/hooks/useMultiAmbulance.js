"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { BANGALORE_ROUTES } from "@/lib/bangaloreRoutes";

const TOTAL = 140;
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

function getVehiclePos(step, total, waypoints) {
  const t   = Math.min(step / total, 1.0);
  const n   = waypoints.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const u   = t * n - seg;
  return {
    lat: lerp(waypoints[seg].lat, waypoints[seg + 1].lat, u),
    lng: lerp(waypoints[seg].lng, waypoints[seg + 1].lng, u),
  };
}

export function useMultiAmbulance() {
  const [ambulances, setAmbulances] = useState({});
  const intervalsRef = useRef({});
  const counterRef   = useRef(0);

  const dispatch = useCallback((routeKey) => {
    const id    = `AMB-${String(++counterRef.current).padStart(2, "0")}`;
    const route = BANGALORE_ROUTES[routeKey];

    setAmbulances(prev => ({
      ...prev,
      [id]: {
        id,
        routeKey,
        route,
        step:      0,
        running:   true,
        arrived:   false,
        signals:   route.waypoints.map((wp, i) => ({
          id: i + 1, name: wp.name, state: "red", corridor_active: false,
        })),
        vehicle: { lat: route.waypoints[0].lat, lng: route.waypoints[0].lng, speed: 60 },
        eta:        480,
        time_saved: 0,
        progress:   0,
      },
    }));

    // Tick interval per ambulance
    intervalsRef.current[id] = setInterval(() => {
      setAmbulances(prev => {
        const amb = prev[id];
        if (!amb || !amb.running || amb.arrived) return prev;

        const nextStep = amb.step + 1;
        const arrived  = nextStep >= TOTAL;
        const progress = Math.round(Math.min(nextStep / TOTAL, 1) * 100);
        const eta      = Math.max(0, Math.round((1 - nextStep / TOTAL) * 480));
        const saved    = Math.round((nextStep / TOTAL) * 280);
        const vpos     = getVehiclePos(nextStep, TOTAL, route.waypoints);
        const speed    = 55 + Math.sin(nextStep * 0.3) * 12 + (nextStep / TOTAL) * 8;

        const signals = route.waypoints.map((wp, i) => {
          const state = arrived ? "done" : getSignalState(i, nextStep, TOTAL, route.waypoints.length);
          return { id: i + 1, name: wp.name, state, corridor_active: state === "green" };
        });

        return {
          ...prev,
          [id]: {
            ...amb,
            step:    nextStep,
            arrived,
            running: !arrived,
            progress,
            eta,
            time_saved: saved,
            vehicle: { lat: vpos.lat, lng: vpos.lng, speed: Math.round(speed) },
            signals,
          },
        };
      });
    }, 110);

    return id;
  }, []);

  const removeAmbulance = useCallback((id) => {
    clearInterval(intervalsRef.current[id]);
    delete intervalsRef.current[id];
    setAmbulances(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};
    counterRef.current   = 0;
    setAmbulances({});
  }, []);

  // Cleanup
  useEffect(() => {
    return () => Object.values(intervalsRef.current).forEach(clearInterval);
  }, []);

  return { ambulances, dispatch, removeAmbulance, resetAll };
}