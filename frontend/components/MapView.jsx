"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ROUTES } from "@/lib/routes";

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 140;
const SIGNAL_COUNT = 7;
const LOOKAHEAD_STEPS = 18;
const CLEAR_BEHIND_STEPS = 6;
const GHOST_TRAIL_LEN = 14;   // path points to keep as ghost trail
const BEARING_SMOOTH = 3;    // rolling-average window for heading
const AI_LOG_MAX = 5;         // max decision log entries shown

// ─── Bangalore real-world traffic hotspots ────────────────────────────────────
const TRAFFIC_INCIDENTS = [
  { lat: 12.9176, lng: 77.6233, label: "SILK BOARD\nCongestion", severity: "high", eta: "4 min" },
  { lat: 12.9767, lng: 77.5713, label: "KR MARKET\nBottleneck", severity: "medium", eta: "2 min" },
  { lat: 12.9699, lng: 77.7500, label: "TIN FACTORY\nJunction Jam", severity: "high", eta: "6 min" },
  { lat: 12.9592, lng: 77.6974, label: "MARATHAHALLI\nSlow Zone", severity: "medium", eta: "3 min" },
];

let googleLoader = null;

// ─── Google Maps singleton loader ────────────────────────────────────────────
function loadGoogleMaps(apiKey) {
  if (googleLoader) return googleLoader;
  googleLoader = new Promise((resolve) => {
    if (window.google?.maps) { resolve(window.google); return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,geometry&v=weekly`;
    s.async = true; s.defer = true;
    s.onload = () => resolve(window.google);
    document.head.appendChild(s);
  });
  return googleLoader;
}

// ─── Lerp position (fractional index) ────────────────────────────────────────
function lerpPosition(step, total, path) {
  if (!path.length) return null;
  const t = Math.min((step / total) * (path.length - 1), path.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  if (i >= path.length - 1) return path[path.length - 1];
  return {
    lat: path[i].lat + (path[i + 1].lat - path[i].lat) * f,
    lng: path[i].lng + (path[i + 1].lng - path[i].lng) * f
  };
}

// ─── Raw bearing between two GPS points ──────────────────────────────────────
function rawBearing(from, to) {
  const r = (d) => (d * Math.PI) / 180;
  const y = Math.sin(r(to.lng - from.lng)) * Math.cos(r(to.lat));
  const x = Math.cos(r(from.lat)) * Math.sin(r(to.lat))
    - Math.sin(r(from.lat)) * Math.cos(r(to.lat)) * Math.cos(r(to.lng - from.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Smoothed bearing (circular mean of last N readings) ─────────────────────
function smoothBearing(history, newBearing) {
  const samples = [...history.slice(-(BEARING_SMOOTH - 1)), newBearing];
  const sinSum = samples.reduce((s, b) => s + Math.sin((b * Math.PI) / 180), 0);
  const cosSum = samples.reduce((s, b) => s + Math.cos((b * Math.PI) / 180), 0);
  return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
}

// ─── Build evenly-spaced signal positions ────────────────────────────────────
function buildSignalPositions(path, count) {
  if (path.length < 4) return [];
  const interval = Math.floor(path.length / (count + 1));
  return Array.from({ length: count }, (_, i) => {
    const idx = (i + 1) * interval;
    return { idx, lat: path[idx].lat, lng: path[idx].lng };
  });
}

// ─── Signal state logic ───────────────────────────────────────────────────────
function signalState(sigIdx, ambIdx) {
  if (ambIdx > sigIdx + CLEAR_BEHIND_STEPS) return "clear";
  if (ambIdx > sigIdx - LOOKAHEAD_STEPS) return "green";
  return "red";
}

// ─── Countdown to next flip (steps until green or clear) ─────────────────────
function stepsUntilChange(sigIdx, ambIdx) {
  const state = signalState(sigIdx, ambIdx);
  if (state === "red") return Math.max(0, sigIdx - LOOKAHEAD_STEPS - ambIdx);
  if (state === "green") return Math.max(0, sigIdx + CLEAR_BEHIND_STEPS - ambIdx);
  return 0;
}

// ─── Memoised signal SVG URLs (only 3 states) ────────────────────────────────
const SIGNAL_ICON_CACHE = {};
function signalSvg(state) {
  if (SIGNAL_ICON_CACHE[state]) return SIGNAL_ICON_CACHE[state];
  const col = state === "green" ? "#00FF88" : state === "clear" ? "#00D4FF" : "#FF2D55";
  const glow = state === "green"
    ? `<circle cx="16" cy="14" r="14" fill="${col}" opacity="0.2"/>
       <circle cx="16" cy="14" r="10" fill="${col}" opacity="0.3"/>`
    : state === "clear"
      ? `<circle cx="16" cy="14" r="10" fill="${col}" opacity="0.18"/>`
      : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="52">
  <rect x="13" y="30" width="6" height="22" fill="#444" rx="2"/>
  <rect x="3" y="0" width="26" height="32" rx="5" fill="#111" stroke="#333" stroke-width="1"/>
  ${glow}
  <circle cx="16" cy="14" r="8" fill="${col}" opacity="0.95"/>
  <circle cx="13" cy="11" r="2.5" fill="white" opacity="0.25"/>
</svg>`;
  SIGNAL_ICON_CACHE[state] = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return SIGNAL_ICON_CACHE[state];
}

// ─── Ambulance SVG with speed-reactive siren glow ─────────────────────────────
function ambulanceSvg(bearing, speed = 60) {
  const sirenR = Math.min(4 + (speed - 40) * 0.06, 7);
  const sirenGlowR = Math.min(7 + (speed - 40) * 0.1, 13);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
  <g transform="rotate(${bearing - 90}, 26, 26)">
    <rect x="6" y="14" width="36" height="22" rx="4" fill="#ffffff" stroke="#00FF88" stroke-width="2"/>
    <rect x="19" y="18" width="4" height="14" fill="#FF2D55"/>
    <rect x="14" y="22" width="14" height="4" fill="#FF2D55"/>
    <rect x="32" y="18" width="10" height="14" rx="2" fill="#e0e0e0" stroke="#00FF88" stroke-width="1.5"/>
    <circle cx="26" cy="14" r="${sirenGlowR}" fill="#00FF88" opacity="0.25"/>
    <circle cx="26" cy="14" r="${sirenR}" fill="#00FF88" opacity="0.95"/>
    <circle cx="14" cy="36" r="4" fill="#222" stroke="#555" stroke-width="1"/>
    <circle cx="38" cy="36" r="4" fill="#222" stroke="#555" stroke-width="1"/>
  </g>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ─── Speed-label SVG (floats beside ambulance) ────────────────────────────────
function hudLabelSvg(speed, progress) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="32">
  <rect x="0" y="0" width="72" height="32" rx="6" fill="rgba(2,11,24,0.88)" stroke="#00FF88" stroke-width="1"/>
  <text x="8"  y="13" font-family="monospace" font-size="9" fill="#00FF88">${speed} km/h</text>
  <text x="8"  y="26" font-family="monospace" font-size="9" fill="#00D4FF">${progress}% done</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ─── Static SVG URLs ──────────────────────────────────────────────────────────
const HOSPITAL_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56">
  <ellipse cx="22" cy="54" rx="12" ry="3" fill="black" opacity="0.3"/>
  <path d="M22 2 C11 2 3 10 3 21 C3 35 22 52 22 52 C22 52 41 35 41 21 C41 10 33 2 22 2Z"
        fill="#00D4FF" stroke="#007FA3" stroke-width="2"/>
  <rect x="18" y="10" width="8" height="22" rx="2" fill="white" opacity="0.95"/>
  <rect x="12" y="16" width="20" height="8" rx="2" fill="white" opacity="0.95"/>
</svg>`)}`;

const ORIGIN_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="46" height="56">
  <defs>
    <filter id="glow-o">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <ellipse cx="23" cy="54" rx="12" ry="3.5" fill="black" opacity="0.4"/>
  <path d="M23 4 C11 4 3 12 3 23 C3 37 23 54 23 54 C23 54 43 37 43 23 C43 12 35 4 23 4Z"
        fill="#FF2040" stroke="#FF8090" stroke-width="2" filter="url(#glow-o)"/>
  <circle cx="23" cy="23" r="10" fill="white" opacity="0.95"/>
  <text x="23" y="27" text-anchor="middle" font-size="12" font-weight="900" fill="#FF2040">O</text>
</svg>`)}`;

const ARRIVAL_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <defs>
    <filter id="glow-a">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <circle cx="50" cy="50" r="42" fill="none" stroke="#00FFAA" stroke-width="4" opacity="0.9" filter="url(#glow-a)">
    <animate attributeName="r" from="12" to="46" dur="0.8s" repeatCount="indefinite"/>
    <animate attributeName="opacity" from="0.9" to="0" dur="0.8s" repeatCount="indefinite"/>
  </circle>
  <circle cx="50" cy="50" r="42" fill="none" stroke="#00FFAA" stroke-width="3" opacity="0.6" filter="url(#glow-a)">
    <animate attributeName="r" from="12" to="46" dur="0.8s" begin="0.3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" from="0.7" to="0" dur="0.8s" begin="0.3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="50" cy="50" r="16" fill="#00FFAA" filter="url(#glow-a)" opacity="1"/>
  <text x="50" y="55" text-anchor="middle" font-size="16" font-weight="900" fill="#020408">✓</text>
</svg>`)}`;

// ═══════════════════════════════════════════════════════════════════════════════
// MapView Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function MapView({ dispatched, snapshot, selectedRoute, tacticalMode = false, allAmbulances }) {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // ── Map / overlay refs ────────────────────────────────────────────────────
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const ambMarker = useRef(null);
  const hudMarker = useRef(null);      // speed/progress HUD label
  const originMarker = useRef(null);
  const destMarker = useRef(null);
  const arrivalMarker = useRef(null);
  const lookaheadCircle = useRef(null);

  const hotspotMarker = useRef(null);
  const heatmapLayer = useRef(null);
  const heatmapMarkers = useRef([]);   // ! markers placed by heatmap clusters (separate from traffic)
  const incidentCircles = useRef([]);  // real-world traffic incident overlays
  const incidentMarkers = useRef([]);  // avoid labels for traffic incidents
  const fleetMarkers = useRef([]);     // 30 scattered standby ambulances
  const corridorRafRef = useRef(null);  // rAF id for corridor pulse
  const corridorPhaseRef = useRef(0);   // sine phase for corridor glow

  // Polylines
  const polyRoute = useRef(null);  // full route dim green
  const polyGlow = useRef(null);  // wide glow
  const polyClear = useRef(null);  // traveled portion
  const polyAhead = useRef(null);  // active green corridor
  const polyCorridorGlow = useRef(null); // extra pulsing glow on top of corridor
  const polyPredict = useRef(null);  // AI predicted corridor (dashed)
  const polyGhost = useRef(null);  // ghost trail behind ambulance

  // Signal overlays
  const signalMarkers = useRef([]);
  const rippleCircles = useRef([]);    // one ripple Circle per signal
  const infoWindows = useRef([]);    // one InfoWindow per signal

  // Route data
  const routePath = useRef([]);
  const signalDefs = useRef([]);

  // Conflict Resolution Layers
  const conflictLines = useRef([]);

  // Ambulance heading smoothing
  const bearingHistory = useRef([0, 0, 0]);
  const prevBearing = useRef(0);

  // Pulse animation timer
  const pulseTimer = useRef(null);
  const pulseState = useRef(true);

  // State change tracker for signals (avoid redundant setIcon calls)
  const sigStateCache = useRef([]);

  const [ready, setReady] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [txHash, setTxHash] = useState("");

  // AI HUD panel state
  const [aiHud, setAiHud] = useState({ nextGreen: "—", corridorPct: 0, speedTrend: "→", decisionLog: [], decisionMode: "STANDBY" });
  const prevSpeedRef = useRef(60);

  const step = snapshot?.step ?? 0;
  const speed = snapshot?.vehicle?.speed ?? 60;
  const progress = snapshot?.progress ?? 0;

  const route = useMemo(
    () => ROUTES[selectedRoute] || ROUTES.route1,
    [selectedRoute]
  );

  // ── Load SDK ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadGoogleMaps(API_KEY).then(() => setReady(true));
  }, []);

  // ── Reset on route or dispatch change ─────────────────────────────────────
  useEffect(() => {
    setArrived(false);
    setAiHud({ nextGreen: "—", corridorPct: 0, speedTrend: "→" });
  }, [selectedRoute, dispatched]);

  // ── Init map + fetch route ─────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    initMap();
    fetchRoute();
  }, [ready, selectedRoute]);

  // ── Handle Tactical Mode Toggle ───────────────────────────────────────────
  useEffect(() => {
    if (!mapObj.current) return;
    if (tacticalMode) {
      mapObj.current.setTilt(65);
      mapObj.current.setZoom(18);
    } else {
      mapObj.current.setTilt(0);
      mapObj.current.setHeading(0); // Reset rotation to north
      if (routePath.current.length) {
        // Zoom back out to show the whole route
        const bounds = new window.google.maps.LatLngBounds();
        routePath.current.forEach(p => bounds.extend(p));
        mapObj.current.fitBounds(bounds);
      }
    }
  }, [tacticalMode]);

  function initMap() {
    const G = window.google.maps;
    if (mapObj.current) return;
    mapObj.current = new G.Map(mapRef.current, {
      center: route.origin, zoom: 14,
      disableDefaultUI: true, zoomControl: true,
      tilt: tacticalMode ? 65 : 0, // apply initial tilt
      styles: [
        { elementType: "geometry", stylers: [{ color: "#f5f7fa" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#1a2a3a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#d0dcea" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#b8cce0" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#aec9e8" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#80aad4" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#1a3a5c" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#a8d0f0" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a7ab0" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c0d4e8" }] },
        { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#eef2f7" }] },
        { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#ddeeca" }] },
      ],
    });
    new window.google.maps.TrafficLayer().setMap(mapObj.current);
    placeFleetScatter();
  }

  // ── Fleet Scatter: 30 ambulances around Bangalore ─────────────────────────────
  function placeFleetScatter() {
    const G = window.google.maps;
    // 30 realistic Bangalore neighborhood positions
    const FLEET_POSITIONS = [
      { lat:12.9716, lng:77.5946, area:"MG Road" },
      { lat:13.0358, lng:77.5970, area:"Hebbal" },
      { lat:12.9279, lng:77.6271, area:"HSR Layout" },
      { lat:12.9591, lng:77.6474, area:"Indiranagar" },
      { lat:12.8399, lng:77.6770, area:"Electronic City" },
      { lat:12.9698, lng:77.7499, area:"Whitefield" },
      { lat:13.0100, lng:77.5500, area:"Yeshwanthpur" },
      { lat:12.9352, lng:77.5241, area:"Banashankari" },
      { lat:12.9121, lng:77.6446, area:"BTM Layout" },
      { lat:12.9784, lng:77.5408, area:"Rajajinagar" },
      { lat:13.0674, lng:77.5777, area:"Yelahanka" },
      { lat:12.9010, lng:77.5700, area:"JP Nagar" },
      { lat:13.0550, lng:77.6500, area:"Banaswadi" },
      { lat:12.9260, lng:77.6762, area:"Sarjapur" },
      { lat:12.9800, lng:77.6400, area:"Domlur" },
      { lat:12.9850, lng:77.7200, area:"Marathahalli" },
      { lat:13.0200, lng:77.6800, area:"KR Puram" },
      { lat:12.8940, lng:77.5977, area:"Narayana Health" },
      { lat:12.9634, lng:77.5762, area:"Victoria Hospital" },
      { lat:12.9775, lng:77.5713, area:"Majestic" },
      { lat:13.0050, lng:77.5680, area:"Malleshwaram" },
      { lat:12.9450, lng:77.6100, area:"Koramangala" },
      { lat:12.9000, lng:77.5100, area:"Kanakapura Rd" },
      { lat:12.9600, lng:77.5000, area:"Mysore Rd" },
      { lat:13.0300, lng:77.5300, area:"Peenya" },
      { lat:12.8800, lng:77.6400, area:"Bommanahalli" },
      { lat:13.0450, lng:77.6100, area:"Thanisandra" },
      { lat:12.9150, lng:77.5500, area:"Kottanur" },
      { lat:12.9550, lng:77.7000, area:"Varthur" },
      { lat:13.0750, lng:77.5200, area:"Bagalur" },
    ];

    const STATES = [
      { label:"AVAILABLE",  fill:"#00CC66", stroke:"#008844", pulse:false },
      { label:"STANDBY",    fill:"#4488BB", stroke:"#2244AA", pulse:false },
      { label:"EN ROUTE ",  fill:"#FF2244", stroke:"#CC0022", pulse:true  },
    ];
    // Distribute: ~50% available, ~35% standby, ~15% en-route
    const stateWeights = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2];

    fleetMarkers.current.forEach(m => m.setMap(null));
    fleetMarkers.current = [];

    FLEET_POSITIONS.forEach((pos, i) => {
      const stIdx = stateWeights[i % stateWeights.length];
      const st = STATES[stIdx];
      const unitId = `BLR-${String(i + 1).padStart(3, "0")}`;

      // Ambulance SVG icon — small, crisp, color-coded
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="22" viewBox="0 0 32 22">
        <rect x="1" y="5" width="24" height="15" rx="2" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.5"/>
        <rect x="25" y="9" width="6" height="9" rx="2" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.5"/>
        <rect x="5" y="8" width="5" height="4" rx="0.5" fill="#cceeff" opacity="0.85"/>
        <!-- red cross -->
        <rect x="13" y="7" width="6" height="2" fill="white" rx="0.5"/>
        <rect x="15" y="5" width="2" height="6" fill="white" rx="0.5"/>
        <!-- Red stripe on roof -->
        <rect x="3" y="5" width="22" height="2.5" rx="1" fill="${st.stroke}" opacity="0.7"/>
        <!-- Siren light -->
        ${st.pulse ? '<circle cx="8" cy="5" r="2" fill="#FF8800" opacity="0.95"/><circle cx="18" cy="5" r="2" fill="#0088FF" opacity="0.95"/>' : ''}
        <!-- Wheels -->
        <circle cx="8"  cy="20" r="3" fill="#1a1a2e" stroke="#333" stroke-width="0.5"/>
        <circle cx="22" cy="20" r="3" fill="#1a1a2e" stroke="#333" stroke-width="0.5"/>
      </svg>`;

      const marker = new G.Marker({
        position: { lat: pos.lat + (Math.random()-0.5)*0.004, lng: pos.lng + (Math.random()-0.5)*0.004 },
        map: mapObj.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new G.Size(32, 22),
          anchor: new G.Point(16, 11),
        },
        zIndex: 2,
        title: `${unitId} — ${st.label} — ${pos.area}`,
      });

      const iw = new G.InfoWindow({
        content: `
          <div style="font-family:'Share Tech Mono',monospace;padding:8px 12px;min-width:170px;background:#020B18;color:#c0dce8;border-radius:4px">
            <div style="font-size:11px;font-weight:700;color:${st.fill};letter-spacing:1px;margin-bottom:4px">${unitId}</div>
            <div style="font-size:9px;color:#4a7a9a;letter-spacing:1px">${st.label.trim()} · ${pos.area}</div>
            <div style="font-size:9px;color:#2a5a6a;margin-top:3px">${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}</div>
            ${st.pulse ? '<div style="font-size:9px;color:#FF2244;margin-top:4px;animation:none">● RESPONDING TO CALL</div>' : ''}
          </div>`,
      });
      marker.addListener("click", () => iw.open(mapObj.current, marker));
      fleetMarkers.current.push(marker);
    });
  }

  // ── Fetch Directions & build overlays ─────────────────────────────────────
  function fetchRoute() {
    if (!mapObj.current) return;
    const G = window.google.maps;
    clearOverlays();

    const origin = route.origin;
    const destination = route.destination;
    // No intermediate waypoints → Google finds the true shortest route

    new G.DirectionsService().route(
      { origin, destination, travelMode: G.TravelMode.DRIVING },
      (result, status) => {
        if (status !== "OK") { console.error("Directions failed:", status); return; }

        // Full geometry from turn-by-turn steps for maximum fidelity
        const steps = result.routes[0].legs[0].steps;
        const full = [];
        steps.forEach(s => s.path.forEach(p => full.push({ lat: p.lat(), lng: p.lng() })));
        routePath.current = full;

        signalDefs.current = buildSignalPositions(routePath.current, SIGNAL_COUNT);
        sigStateCache.current = new Array(SIGNAL_COUNT).fill("red");

        drawBaseOverlays();
        placeSignalMarkers();
        placeEndpointMarkers();
        setupPredictiveHotspot();
        placeTrafficIncidents();
        startPulseAnimation();
        startCorridorPulse();
        mapObj.current.panTo(routePath.current[0]);
      }
    );
  }

  // ── Pulse animation + Animated Flow Arrows ────────────────────────────────
  function startPulseAnimation() {
    if (pulseTimer.current) clearInterval(pulseTimer.current);
    let offset = 0;
    pulseTimer.current = setInterval(() => {
      pulseState.current = !pulseState.current;
      offset = (offset - 1.5) % 20; // Animate arrows backward natively (which flows forward)
      if (polyAhead.current) {
        // Pulse opacity and slide icons
        const icons = polyAhead.current.get("icons") || [];
        if (icons.length) {
          icons[0].offset = `${-(offset)}px`;
          polyAhead.current.set("icons", icons);
        }
      }
    }, 60); // 60ms for smooth 16fps arrow flow
  }

  // ── Corridor Pulse (rAF sine-wave glow) ─────────────────────────────────────────
  function startCorridorPulse() {
    if (corridorRafRef.current) cancelAnimationFrame(corridorRafRef.current);
    let phase = 0;
    const tick = () => {
      phase = (phase + 0.05) % (Math.PI * 2); // Faster pulse
      const opacity = 0.35 + Math.sin(phase) * 0.25; // Oscillates 0.1-0.6
      const weight  = 22 + Math.sin(phase) * 8;      // Thicker: oscillates 14-30
      polyCorridorGlow.current?.setOptions({ strokeOpacity: opacity, strokeWeight: weight });
      corridorRafRef.current = requestAnimationFrame(tick);
    };
    corridorRafRef.current = requestAnimationFrame(tick);
  }

  // ── Setup Predictive Congestion Heatmap (multi-cluster) ──────────────────────
  function setupPredictiveHotspot() {
    const G = window.google.maps;
    if (heatmapLayer.current) heatmapLayer.current.setMap(null);
    if (hotspotMarker.current) hotspotMarker.current.setMap(null);
    if (!routePath.current.length || routePath.current.length < 50) return;

    const path = routePath.current;
    const heatData = [];

    // 3 clusters at 40%, 60%, 80% of route — simulates real Bangalore congestion pockets
    const clusterFracs = [0.40, 0.62, 0.80];
    const clusterLabels = [
      { msg: "⚠️ Congestion in 6 min", conf: "88%", color: "#e08000" },
      { msg: "🔴 Bottleneck ahead",   conf: "94%", color: "#c01020" },
      { msg: "🏫 School zone — slow", conf: "81%", color: "#cc8800" },
    ];

    clusterFracs.forEach((frac, ci) => {
      const hotIdx = Math.floor(path.length * frac);
      const hotPos = path[hotIdx];
      const spread = ci === 1 ? 0.007 : 0.004;

      for (let i = 0; i < 28; i++) {
        const latOff = (Math.random() - 0.5) * spread;
        const lngOff = (Math.random() - 0.5) * spread;
        heatData.push(new G.LatLng(hotPos.lat + latOff, hotPos.lng + lngOff));
      }

      // Avoid marker with exclamation icon
      const avoidSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="13" fill="${clusterLabels[ci].color}" stroke="#fff" stroke-width="1.5"/><text x="14" y="19" text-anchor="middle" font-family="monospace" font-size="15" font-weight="700" fill="#fff">!</text></svg>`;
      const avoidMarker = new G.Marker({
        position: hotPos, map: mapObj.current,
        icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(avoidSvg)}`, scaledSize: new G.Size(28, 28), anchor: new G.Point(14, 14) },
        zIndex: 6, title: clusterLabels[ci].msg,
      });
      heatmapMarkers.current.push(avoidMarker);  // own ref, not incidentMarkers

      const iw = new G.InfoWindow({
        content: `<div style="font-family:'Rajdhani',sans-serif;padding:6px 10px;min-width:155px">
          <div style="font-weight:700;font-size:13px;color:${clusterLabels[ci].color}">${clusterLabels[ci].msg}</div>
          <div style="font-size:11px;color:#3a5a7c;margin-top:3px">AI Confidence: <b style="color:#00a854">${clusterLabels[ci].conf}</b></div>
          <div style="font-size:11px;color:#3a5a7c">GreenWave rerouting active</div>
        </div>`,
        disableAutoPan: true,
      });
      if (ci === 1) iw.open(mapObj.current, avoidMarker); // only auto-open the main one
      avoidMarker.addListener("click", () => iw.open(mapObj.current, avoidMarker));
      infoWindows.current.push(iw);
    });

    heatmapLayer.current = new G.visualization.HeatmapLayer({
      data: heatData, map: mapObj.current,
      radius: 38, opacity: 0.75,
      gradient: ["rgba(255,200,0,0)","rgba(255,170,0,0.4)","rgba(255,110,0,0.75)","rgba(220,0,0,1.0)"],
    });

    // Animated heatmap intensity breathing
    let intensity = 0.75;
    let dir = 1;
    const breathe = setInterval(() => {
      intensity += dir * 0.008;
      if (intensity > 1.0) dir = -1;
      if (intensity < 0.55) dir = 1;
      heatmapLayer.current?.setOptions({ opacity: intensity });
    }, 80);
    // Store breathe id for cleanup via a closure ref approach
    hotspotMarker.current = { _breatheId: breathe, setMap: () => {} }; // sentinel
  }

  // ── Place real-world traffic incident overlays ─────────────────────────────
  function placeTrafficIncidents() {
    const G = window.google.maps;
    incidentCircles.current.forEach(c => c.setMap(null));
    incidentCircles.current = [];
    incidentMarkers.current.forEach(m => m.setMap(null));
    incidentMarkers.current = [];

    TRAFFIC_INCIDENTS.forEach(inc => {
      const col = inc.severity === "high" ? "#FF2244" : "#FFB020";
      const circle = new G.Circle({
        center: { lat: inc.lat, lng: inc.lng },
        radius: inc.severity === "high" ? 220 : 150,
        map: mapObj.current,
        strokeColor: col, strokeOpacity: 0.7, strokeWeight: 2,
        fillColor: col, fillOpacity: 0.12, zIndex: 2,
      });
      incidentCircles.current.push(circle);
    });
  }

  // ── Remove all overlays ───────────────────────────────────────────────────
  function clearOverlays() {
    if (pulseTimer.current) { clearInterval(pulseTimer.current); pulseTimer.current = null; }
    if (corridorRafRef.current) { cancelAnimationFrame(corridorRafRef.current); corridorRafRef.current = null; }
    [polyRoute, polyGlow, polyClear, polyAhead, polyCorridorGlow, polyPredict, polyGhost].forEach(r => {
      r.current?.setMap(null); r.current = null;
    });
    signalMarkers.current.forEach(m => m.setMap(null));
    signalMarkers.current = [];
    rippleCircles.current.forEach(c => c?.setMap(null));
    rippleCircles.current = [];
    infoWindows.current.forEach(w => w?.close());
    infoWindows.current = [];
    if (heatmapLayer.current) { heatmapLayer.current.setMap(null); heatmapLayer.current = null; }
    if (hotspotMarker.current) {
      if (hotspotMarker.current._breatheId) clearInterval(hotspotMarker.current._breatheId);
      hotspotMarker.current = null;
    }
    heatmapMarkers.current.forEach(m => m.setMap(null)); heatmapMarkers.current = [];
    incidentCircles.current.forEach(c => c.setMap(null)); incidentCircles.current = [];
    incidentMarkers.current.forEach(m => m.setMap(null)); incidentMarkers.current = [];


    [ambMarker, hudMarker, originMarker, destMarker, arrivalMarker, lookaheadCircle].forEach(r => {
      r.current?.setMap(null); r.current = null;
    });
  }

  // ── Draw base polylines ───────────────────────────────────────────────────
  function drawBaseOverlays() {
    const G = window.google.maps;
    const path = routePath.current;

    polyGlow.current = new G.Polyline({
      path, map: mapObj.current,
      strokeColor: "#00a854", strokeOpacity: 0.12, strokeWeight: 26,
    });
    polyRoute.current = new G.Polyline({
      path, map: mapObj.current,
      strokeColor: "#0077cc", strokeOpacity: 0.25, strokeWeight: 5, zIndex: 1,
    });
    polyGhost.current = new G.Polyline({
      path: [], map: mapObj.current,
      strokeColor: "#0077cc", strokeOpacity: 0.5, strokeWeight: 4, zIndex: 2,
    });
    polyClear.current = new G.Polyline({
      path: [], map: mapObj.current,
      strokeColor: "#0055aa", strokeOpacity: 0.9, strokeWeight: 7, zIndex: 3,
    });
    polyAhead.current = new G.Polyline({
      path: [], map: mapObj.current,
      strokeColor: "#00a854", strokeOpacity: 0.95, strokeWeight: 10, zIndex: 4,
      icons: [{
        icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, strokeColor: "#ffffff", strokeOpacity: 1, scale: 2 },
        offset: "0%",
        repeat: "40px",
      }],
    });
    // Pulsing glow layer on top of main corridor
    polyCorridorGlow.current = new G.Polyline({
      path: [], map: mapObj.current,
      strokeColor: "#00FF88", strokeOpacity: 0.15, strokeWeight: 22, zIndex: 3,
    });
    // AI-predicted corridor: dashed
    polyPredict.current = new G.Polyline({
      path: [], map: mapObj.current,
      strokeColor: "#0077cc", strokeOpacity: 0.6, strokeWeight: 5, zIndex: 3,
      icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 }, offset: "0", repeat: "18px" }],
    });
  }

  // ── Place signal markers + ripple circles + info windows ──────────────────
  function placeSignalMarkers() {
    const G = window.google.maps;
    signalMarkers.current = [];
    rippleCircles.current = [];
    infoWindows.current = [];

    signalDefs.current.forEach((sig, i) => {
      const pos = { lat: sig.lat, lng: sig.lng };

      // Signal marker
      const marker = new G.Marker({
        position: pos, map: mapObj.current,
        icon: { url: signalSvg("red"), scaledSize: new G.Size(28, 44), anchor: new G.Point(14, 44) },
        zIndex: 5, title: `Signal ${i + 1}`,
      });

      // Ripple circle (hidden until signal turns green)
      const ripple = new G.Circle({
        center: pos, radius: 0, map: mapObj.current,
        strokeColor: "#00FF88", strokeOpacity: 0.0,
        strokeWeight: 2, fillColor: "#00FF88", fillOpacity: 0.0,
        zIndex: 2,
      });

      // InfoWindow with signal details
      const iw = new G.InfoWindow({
        content: `
          <div style="background:#ffffff;color:#00a854;font-family:monospace;padding:8px 12px;border-radius:4px;font-size:12px;min-width:140px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            <b>Signal ${i + 1}</b><br/>
            <span style="color:#3a5a7c">Path index: ${sig.idx}</span><br/>
            <span id="iw-state-${i}" style="color:#e5193a">● RED</span>
          </div>`,
        pixelOffset: new G.Size(0, -48),
      });

      marker.addListener("click", () => {
        infoWindows.current.forEach(w => w.close());
        iw.open(mapObj.current, marker);
      });

      signalMarkers.current.push(marker);
      rippleCircles.current.push(ripple);
      infoWindows.current.push(iw);
    });
  }

  // ── Place endpoint markers ────────────────────────────────────────────────
  function placeEndpointMarkers() {
    const G = window.google.maps;
    const path = routePath.current;
    if (!path.length) return;
    originMarker.current = new G.Marker({
      position: path[0], map: mapObj.current,
      icon: { url: ORIGIN_ICON_URL, scaledSize: new G.Size(36, 46), anchor: new G.Point(18, 46) },
      zIndex: 8, title: route.origin?.name ?? "Origin",
    });
    destMarker.current = new G.Marker({
      position: path[path.length - 1], map: mapObj.current,
      icon: { url: HOSPITAL_ICON_URL, scaledSize: new G.Size(44, 56), anchor: new G.Point(22, 56) },
      zIndex: 8, title: route.destination?.name ?? "Hospital",
    });
  }

  // ── Main animation tick ───────────────────────────────────────────────────
  useEffect(() => {
    if (!dispatched || !routePath.current.length || !mapObj.current) return;

    requestAnimationFrame(() => {
      const G = window.google.maps;
      const path = routePath.current;
      const pos = lerpPosition(step, TOTAL_STEPS, path);
      if (!pos) return;

      const t = Math.min((step / TOTAL_STEPS) * (path.length - 1), path.length - 1);
      const ambPathIdx = Math.floor(t);
      const nextIdx = Math.min(ambPathIdx + 1, path.length - 1);

      // ── Smooth bearing ────────────────────────────────────────────────────
      const raw = path[nextIdx] ? rawBearing(pos, path[nextIdx]) : prevBearing.current;
      const bearing = smoothBearing(bearingHistory.current, raw);
      bearingHistory.current = [...bearingHistory.current.slice(-2), raw];
      prevBearing.current = bearing;

      // ── Ambulance marker ──────────────────────────────────────────────────
      const ambIcon = {
        url: ambulanceSvg(bearing, speed),
        scaledSize: new G.Size(52, 52),
        anchor: new G.Point(26, 26),
      };
      if (!ambMarker.current) {
        ambMarker.current = new G.Marker({
          position: pos, map: mapObj.current, icon: ambIcon, zIndex: 20, title: "Ambulance",
        });
      } else {
        ambMarker.current.setPosition(pos);
        ambMarker.current.setIcon(ambIcon);
      }

      // ── Speed + progress HUD label ────────────────────────────────────────
      const hudIcon = {
        url: hudLabelSvg(speed, progress),
        scaledSize: new G.Size(72, 32),
        anchor: new G.Point(-8, 16),
      };
      if (!hudMarker.current) {
        hudMarker.current = new G.Marker({
          position: pos, map: mapObj.current, icon: hudIcon, zIndex: 19,
          optimized: false,
        });
      } else {
        hudMarker.current.setPosition(pos);
        hudMarker.current.setIcon(hudIcon);
      }

      // ── Clean Lookahead circle ────────────────────────────────────────────
      if (!lookaheadCircle.current) {
        lookaheadCircle.current = new G.Circle({
          center: pos, radius: 800, map: mapObj.current,
          strokeColor: "#0077cc", strokeOpacity: 0.3, strokeWeight: 1.5,
          fillColor: "#0077cc", fillOpacity: 0.04, zIndex: 1,
        });
      } else {
        lookaheadCircle.current.setCenter(pos);
      }

      // ── Polylines ─────────────────────────────────────────────────────────
      // Ghost trail: last GHOST_TRAIL_LEN points behind ambulance
      const ghostStart = Math.max(0, ambPathIdx - GHOST_TRAIL_LEN);
      polyGhost.current?.setPath(path.slice(ghostStart, ambPathIdx + 1));

      // Cleared trail: origin → ambulance
      polyClear.current?.setPath(path.slice(0, ambPathIdx + 1));

      // Active corridor: ambulance → lookahead
      const waveEnd = Math.min(ambPathIdx + LOOKAHEAD_STEPS, path.length - 1);
      polyAhead.current?.setPath(path.slice(ambPathIdx, waveEnd + 1));
      polyCorridorGlow.current?.setPath(path.slice(ambPathIdx, waveEnd + 1));

      // AI-predicted corridor: beyond lookahead (dashed)
      const predEnd = Math.min(ambPathIdx + LOOKAHEAD_STEPS * 2, path.length - 1);
      polyPredict.current?.setPath(path.slice(waveEnd, predEnd + 1));

      // ── Signals ───────────────────────────────────────────────────────────
      let nextGreenName = "—";
      let greenCount = 0;

      signalMarkers.current.forEach((marker, i) => {
        const sig = signalDefs.current[i];
        if (!sig) return;
        const state = signalState(sig.idx, ambPathIdx);
        const cached = sigStateCache.current[i];

        if (state === "green") greenCount++;

        // Find next upcoming RED→GREEN signal for AI HUD
        if (state === "red" && nextGreenName === "—") {
          const steps = stepsUntilChange(sig.idx, ambPathIdx);
          const secs = Math.round((steps / TOTAL_STEPS) * 480);
          nextGreenName = `Signal ${i + 1} in ${secs}s`;
        }

        // Only update icon when state actually changes
        if (state !== cached) {
          sigStateCache.current[i] = state;

          const isGreen = state === "green";
          const size = isGreen ? new G.Size(34, 52) : new G.Size(28, 44);
          const anchor = isGreen ? new G.Point(17, 52) : new G.Point(14, 44);
          marker.setIcon({ url: signalSvg(state), scaledSize: size, anchor });
          marker.setZIndex(isGreen ? 10 : 5);

          // Animate ripple when signal turns green
          if (isGreen && rippleCircles.current[i]) {
            const ripple = rippleCircles.current[i];
            ripple.setOptions({ radius: 30, strokeOpacity: 0.6, fillOpacity: 0.1, strokeColor: "#00a854", fillColor: "#00a854" });
            let r = 30; let op = 0.6;
            const fade = setInterval(() => {
              r = Math.min(r + 18, 300);
              op = Math.max(op - 0.06, 0);
              ripple.setOptions({ radius: r, strokeOpacity: op, fillOpacity: op * 0.15 });
              if (op <= 0) clearInterval(fade);
            }, 60);
          }
          if (state === "clear" && rippleCircles.current[i]) {
            rippleCircles.current[i].setOptions({ radius: 0, strokeOpacity: 0, fillOpacity: 0 });
          }
        }
      });

      // ── AI HUD update ─────────────────────────────────────────────────────
      const corridorPct = Math.round((greenCount / SIGNAL_COUNT) * 100);
      const speedTrend = speed > prevSpeedRef.current ? "↑" : speed < prevSpeedRef.current ? "↓" : "→";
      prevSpeedRef.current = speed;
      const decisionMode = greenCount >= 4 ? "CORRIDOR_SYNC" : greenCount >= 2 ? "PREDICTIVE" : greenCount >= 1 ? "REACTIVE" : "STANDBY";

      setAiHud(prev => {
        const newLog = [...(prev.decisionLog || [])];

        signalDefs.current.forEach((sig, i) => {
          const st = signalState(sig.idx, ambPathIdx);
          if (st === "green") {
            const logKey = `${i}-g-${Math.floor(step / 3)}`;
            if (!newLog.some(e => e.key === logKey)) {
              const conf = 88 + Math.floor(Math.random() * 10);
              newLog.unshift({ key: logKey, text: `Sig ${i + 1} pre-cleared · ${LOOKAHEAD_STEPS}s ahead · ${conf}%` });
            }
          }
        });
        return { nextGreen: nextGreenName, corridorPct, speedTrend, decisionLog: newLog.slice(0, AI_LOG_MAX), decisionMode };
      });


      // ── Camera follow ─────────────────────────────────────────────────────
      if (step % 3 === 0) {
        if (tacticalMode) {
          // In tactical mode, aggressively pan, maintain high zoom and follow the bearing
          mapObj.current.setZoom(18);
          mapObj.current.panTo(pos);
          mapObj.current.setHeading(bearing); 
        } else {
          // Just normal panning
          mapObj.current.panTo(pos);
        }
      }

      // ── Arrival ceremony ──────────────────────────────────────────────────
      if (step >= TOTAL_STEPS - 2 && !arrived) {
        setArrived(true);
        // Generate mock TX hash once on arrival for the MapView banner
        const chars = "0123456789abcdef";
        let hash = "0x";
        for(let i=0; i<6; i++) hash += chars[Math.floor(Math.random()*16)];
        hash += "...";
        for(let i=0; i<4; i++) hash += chars[Math.floor(Math.random()*16)];
        setTxHash(hash);
        
        triggerArrival(pos, path[path.length - 1]);
      }
    });

    // ── Multi-Agent Conflict Resolution (Visual Links) ──────────────────────
    if (window.google?.maps && mapObj.current && allAmbulances) {
      const activeAmbs = Object.values(allAmbulances).filter(a => !a.arrived);
      
      // Clean up old conflict lines
      conflictLines.current.forEach(line => line.setMap(null));
      conflictLines.current = [];

      // Draw lines between ambulances closer than 1.5km
      for (let i = 0; i < activeAmbs.length; i++) {
        for (let j = i + 1; j < activeAmbs.length; j++) {
          const a1 = activeAmbs[i];
          const a2 = activeAmbs[j];
          if (!a1.vehicle || !a2.vehicle) continue;

          // Simple distance approx (Euclidean on lat/lng is okay for local city scale, ~1km threshold)
          const dist = Math.sqrt(Math.pow(a1.vehicle.lat - a2.vehicle.lat, 2) + Math.pow(a1.vehicle.lng - a2.vehicle.lng, 2));
          
          if (dist < 0.015) { // Roughly 1.5km
            const line = new window.google.maps.Polyline({
              path: [
                { lat: a1.vehicle.lat, lng: a1.vehicle.lng },
                { lat: a2.vehicle.lat, lng: a2.vehicle.lng }
              ],
              geodesic: true,
              strokeColor: '#FF2040',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              icons: [{
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                offset: "0",
                repeat: "10px"
              }],
              zIndex: 30,
              map: mapObj.current
            });
            conflictLines.current.push(line);
          }
        }
      }
    }

  }, [step, dispatched, speed, progress, allAmbulances]);

  // ── Arrival ceremony ──────────────────────────────────────────────────────
  function triggerArrival(ambPos, destPos) {
    const G = window.google.maps;
    mapObj.current.panTo(destPos);
    mapObj.current.setZoom(17);
    if (arrivalMarker.current) arrivalMarker.current.setMap(null);
    arrivalMarker.current = new G.Marker({
      position: destPos, map: mapObj.current,
      icon: { url: ARRIVAL_ICON_URL, scaledSize: new G.Size(80, 80), anchor: new G.Point(40, 40) },
      zIndex: 25, title: "Arrived!",
    });
    setTimeout(() => {
      ambMarker.current?.setMap(null); ambMarker.current = null;
      hudMarker.current?.setMap(null); hudMarker.current = null;
      lookaheadCircle.current?.setMap(null); lookaheadCircle.current = null;
      polyGhost.current?.setPath([]);
      polyPredict.current?.setPath([]);
    }, 1200);
    setTimeout(() => {
      mapObj.current?.fitBounds({
        north: Math.max(routePath.current[0].lat, destPos.lat) + 0.005,
        south: Math.min(routePath.current[0].lat, destPos.lat) - 0.005,
        east: Math.max(routePath.current[0].lng, destPos.lng) + 0.005,
        west: Math.min(routePath.current[0].lng, destPos.lng) - 0.005,
      });
    }, 3500);
  }

  // ── Clean up when not dispatched ──────────────────────────────────────────
  useEffect(() => {
    if (!dispatched) {
      [ambMarker, hudMarker, arrivalMarker, lookaheadCircle].forEach(r => {
        r.current?.setMap(null); r.current = null;
      });
      polyClear.current?.setPath([]);
      polyAhead.current?.setPath([]);
      polyCorridorGlow.current?.setPath([]);
      polyGhost.current?.setPath([]);
      polyPredict.current?.setPath([]);
      rippleCircles.current.forEach(c => c?.setOptions({ radius: 0, strokeOpacity: 0, fillOpacity: 0 }));
      conflictLines.current.forEach(line => line.setMap(null));
      conflictLines.current = [];
      sigStateCache.current = new Array(SIGNAL_COUNT).fill("red");
      signalMarkers.current.forEach(m => {
        if (window.google?.maps) {
          const G = window.google.maps;
          m.setIcon({ url: signalSvg("red"), scaledSize: new G.Size(28, 44), anchor: new G.Point(14, 44) });
          m.setZIndex(5);
        }
      });
      setArrived(false);
      setAiHud({ nextGreen: "—", corridorPct: 0, speedTrend: "→", decisionLog: [], decisionMode: "STANDBY" });
    }
  }, [dispatched]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (pulseTimer.current) clearInterval(pulseTimer.current); };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Map canvas */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Route info badge ──────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 12, left: 12,
        background: "rgba(255,255,255,0.95)", border: "1px solid #b0c8de",
        padding: "10px 14px", borderRadius: 8, fontFamily: "monospace",
        fontSize: 11, color: "#1a2a3a", backdropFilter: "blur(6px)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
      }}>
        <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 4, letterSpacing: 1, color: "#0077cc" }}>
          ⚡ GREENWAVE AI
        </div>
        <div style={{ color: "#e5193a", marginBottom: 2 }}>📍 {route.origin?.name ?? "Origin"}</div>
        <div style={{ color: "#00a854" }}>🏥 {route.destination?.name ?? "Destination"}</div>
      </div>

      {/* ── AI DECISION HUD ───────────────────────────────────────────── */}
      {dispatched && !arrived && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(2,8,20,0.93)", border: "1px solid rgba(0,168,84,0.5)",
          padding: "12px 14px", borderRadius: 10, fontFamily: "monospace",
          fontSize: 11, color: "#c0dce8", backdropFilter: "blur(10px)",
          boxShadow: "0 4px 24px rgba(0,168,84,0.18), 0 2px 8px rgba(0,0,0,0.4)",
          minWidth: 218, maxWidth: 240,
        }}>
          {/* Header + mode badge */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontWeight:"bold", fontSize:11, color:"#00FF88", letterSpacing:1.5 }}>🤖 AI DECISION</span>
            <span style={{
              fontSize:8, letterSpacing:1, padding:"2px 6px", borderRadius:3, fontWeight:700,
              background: aiHud.decisionMode==="CORRIDOR_SYNC" ? "rgba(0,255,136,0.2)" : aiHud.decisionMode==="PREDICTIVE" ? "rgba(0,150,255,0.2)" : aiHud.decisionMode==="REACTIVE" ? "rgba(255,170,0,0.2)" : "rgba(100,130,160,0.15)",
              color: aiHud.decisionMode==="CORRIDOR_SYNC" ? "#00FF88" : aiHud.decisionMode==="PREDICTIVE" ? "#00D4FF" : aiHud.decisionMode==="REACTIVE" ? "#FFB020" : "#8aaabb",
              border: `1px solid ${aiHud.decisionMode==="CORRIDOR_SYNC" ? "rgba(0,255,136,0.35)" : aiHud.decisionMode==="PREDICTIVE" ? "rgba(0,212,255,0.35)" : "rgba(200,200,200,0.1)"}`,
            }}>{aiHud.decisionMode || "STANDBY"}</span>
          </div>
          {/* Next green */}
          <div style={{ marginBottom:5 }}>
            <span style={{ color:"#3a6a8a", fontSize:9 }}>NEXT GREEN · </span>
            <span style={{ color:"#00FF88", fontWeight:"bold", fontSize:10 }}>{aiHud.nextGreen}</span>
          </div>
          {/* Speed */}
          <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ color:"#3a6a8a", fontSize:9 }}>SPEED</span>
            <span style={{ color:aiHud.speedTrend==="↑"?"#00FF88":aiHud.speedTrend==="↓"?"#FF2244":"#8aaabb", fontSize:14 }}>{aiHud.speedTrend}</span>
            <span style={{ color:"#c0dce8", fontSize:10 }}>{speed} km/h</span>
          </div>
          {/* Corridor clearance bar */}
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ color:"#3a6a8a", fontSize:9 }}>CORRIDOR CLEAR</span>
              <span style={{ color:aiHud.corridorPct>50?"#00FF88":"#FF2244", fontWeight:"bold", fontSize:9 }}>{aiHud.corridorPct}%</span>
            </div>
            <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${aiHud.corridorPct}%`, background:"linear-gradient(90deg,#005533,#00FF88)", borderRadius:3, transition:"width 0.5s", boxShadow:"0 0 8px rgba(0,255,136,0.5)" }} />
            </div>
          </div>
          {/* Decision log */}
          {(aiHud.decisionLog||[]).length > 0 && (
            <div>
              <div style={{ fontSize:8, color:"#1a4a6a", letterSpacing:1, marginBottom:4 }}>DECISION LOG</div>
              {(aiHud.decisionLog||[]).map((e,i) => (
                <div key={e.key} style={{ fontSize:8, color:i===0?"#00FF88":"#2a5a7a", fontFamily:"monospace", letterSpacing:0.3, animation:i===0?"ai-decision-in 0.3s ease":"none", opacity:1-i*0.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:2 }}>
                  ▸ {e.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 16, left: 12,
        background: "rgba(255,255,255,0.95)", border: "1px solid #dce6f0",
        padding: "8px 12px", borderRadius: 8, fontFamily: "monospace",
        fontSize: 10, color: "#3a5a7c", display: "flex", flexDirection: "column", gap: 4,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        {[
          { col: "#0055aa", h: 4, w: 24, r: 2, label: "Cleared path" },
          { col: "#00a854", h: 4, w: 24, r: 2, label: "Active corridor flow" },
          { col: "#0077cc", h: 2, w: 24, r: 1, label: "Ghost trail", opacity: 0.5 },
          { col: "#0099cc", h: 2, w: 24, r: 1, label: "AI predicted wave", dashed: true },
          { col: "#00a854", h: 10, w: 10, r: "50%", label: "Signal: GREEN" },
          { col: "#e5193a", h: 10, w: 10, r: "50%", label: "Signal: RED" },
          { col: "#0077cc", h: 10, w: 10, r: "50%", label: "Signal: CLEAR" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: item.w, height: item.h,
              background: item.dashed
                ? `repeating-linear-gradient(90deg, ${item.col} 0px, ${item.col} 4px, transparent 4px, transparent 8px)`
                : item.col,
              borderRadius: item.r, display: "inline-block",
              opacity: item.opacity ?? 1,
            }} />
            {item.label}
          </div>
        ))}
      </div>

      {/* ── Arrived banner ───────────────────────────────────────────────── */}
      {arrived && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(255,255,255,0.95)", border: "2px solid #00a854",
          borderRadius: 12, padding: "24px 40px", textAlign: "center",
          fontFamily: "monospace", backdropFilter: "blur(12px)",
          animation: "fadeIn 0.5s ease", boxShadow: "0 8px 32px rgba(0,168,84,0.25)",
          pointerEvents: "none", zIndex: 100,
        }}>
          <div style={{ fontSize: 32, color: "#00a854", fontWeight: "bold", letterSpacing: 2 }}>
            ✓ ARRIVED
          </div>
          <div style={{ fontSize: 14, color: "#3a5a7c", marginTop: 8, fontWeight: "bold" }}>
            {route.destination?.name ?? "Hospital"} — Time Critical Complete
          </div>
          <div style={{ fontSize: 12, color: "#5a7a9a", marginTop: 4 }}>
            AUDIT LOG RECORDED · TX: {txHash}
          </div>
        </div>
      )}


      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%,-55%); }
          to   { opacity: 1; transform: translate(-50%,-50%); }
        }
      `}</style>
    </div>
  );
}