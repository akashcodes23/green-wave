"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

import { ROUTES }                  from "@/lib/routes";
import { useMultiAmbulance }       from "@/hooks/useMultiAmbulance";
import { useVoice, VOICE_SCRIPTS } from "@/hooks/useVoice";
import { useWebSocket }            from "@/hooks/useWebSocket";

import DispatchPanel from "@/components/DispatchPanel";
import MetricsPanel  from "@/components/MetricsPanel";
import CameraFeed    from "@/components/CameraFeed";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// ─── Live Telemetry Hacker Terminal ───────────────────────────────────────────
function LiveTelemetryTerminal({ activeAmbulances }) {
  const [logs, setLogs] = useState([]);
  const logsRef = useRef([]);

  useEffect(() => {
    if (activeAmbulances.length === 0) return;
    
    // Simulate high-velocity raw JSON telemetry
    const interval = setInterval(() => {
      const amb = activeAmbulances[Math.floor(Math.random() * activeAmbulances.length)];
      if (!amb) return;
      
      const ping = 12 + Math.floor(Math.random() * 8);
      const rpm = 2100 + Math.floor(Math.random() * 400);
      const gforce = (Math.random() * 0.4).toFixed(2);
      
      let newLog = `> [${new Date().toISOString()}] {"unit":"${amb.id}","lat":${(12.97+Math.random()*0.01).toFixed(6)},"lng":${(77.59+Math.random()*0.01).toFixed(6)},"spd":${amb.vehicle.speed},"rpm":${rpm},"gfrc":${gforce},"png":${ping}ms}`;
      
      // Inject narrative conflict logs when multiple ambulances are active
      if (activeAmbulances.length > 1 && Math.random() > 0.95) {
        const otherAmb = activeAmbulances.find(a => a.id !== amb.id);
        if (otherAmb) {
          const type = Math.random() > 0.5 ? "CONFLICT DETECTED" : "RESOLVED";
          const color = type === "CONFLICT DETECTED" ? "#FF2040" : "#FFB020";
          newLog = {
            text: `> [!] ${type}: ${amb.id} vs ${otherAmb.id} — PRIORITY OVERRIDE`, 
            color 
          };
        }
      }

      logsRef.current = [newLog, ...logsRef.current].slice(0, 15);
      setLogs([...logsRef.current]);
    }, 150); // Updates very fast

    return () => clearInterval(interval);
  }, [activeAmbulances]);

  if (activeAmbulances.length === 0) return null;

  return (
    <div style={{ flex: 1, background: "#020408", borderTop: "1px solid rgba(0,255,136,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", background: "rgba(0,255,136,0.1)", borderBottom: "1px solid rgba(0,255,136,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: "var(--green)", letterSpacing: 2 }}>RAW TELEMETRY STREAM</span>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", animation: "blink 0.2s infinite" }} />
        </div>
      </div>
      
      <div style={{ padding: "10px 12px", overflowY: "hidden", display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
        {logs.map((log, i) => {
          const isObj = typeof log === 'object';
          const text = isObj ? log.text : log;
          const color = isObj ? log.color : (i === 0 ? "#00FF88" : "rgba(0,255,136,0.5)");
          
          return (
            <div key={i} style={{ 
              fontFamily: "monospace", fontSize: 9, color, 
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              opacity: 1 - (i * 0.06),
              fontWeight: isObj ? 700 : 400
            }}>
              {text}
            </div>
          );
        })}
        {/* Scanline overlay for hacker effect */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.25) 50%)", backgroundSize: "100% 4px", pointerEvents: "none" }} />
      </div>
    </div>
  );
}

// ─── Animated Number (counts up on value change) ──────────────────────────────
function AnimatedNumber({ value, suffix = "", prefix = "" }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (value === prev.current) return;
    const start = prev.current;
    const end   = value;
    const steps = 20;
    const delta = (end - start) / steps;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplay(Math.round(start + delta * i));
      if (i >= steps) { clearInterval(id); prev.current = end; }
    }, 30);
    return () => clearInterval(id);
  }, [value]);
  return <>{prefix}{display}{suffix}</>;
}

// ─── AI Decision Feed ─────────────────────────────────────────────────────────
const AI_MESSAGES = [
  (r) => `[conf: 94.2%] 🟢 Signal optimized on ${r} corridor — traffic-weighted Dijkstra applied`,
  (r) => `[conf: 97.8%] 📡 Cross-traffic rerouted via Hosur bypass for ${r}`,
  (r) => `[conf: 91.5%] ⚡ Predictive wave active — syncing ${r} with BBMP grid`,
  (r) => `[conf: 99.1%] 🔒 Priority lock engaged — 4 signals frozen on ${r}`,
  (r) => `[conf: 88.6%] 📊 Corridor success probability high — rerouting away from ${r} bottleneck`,
  ()  => `[conf: 96.4%] 🔄 Auto-dispatch queued — signal offset stagger initiated`,
  ()  => `[conf: 92.7%] 🌐 BBMP traffic API synced — incident data updated`,
  ()  => `[conf: 95.3%] 📍 GPS deviation detected — recalculating optimal path`,
];

function AIDecisionFeed({ ambulances }) {
  const [logs, setLogs] = useState([
    { id: 0, time: "06:05:01", msg: "🟢 GreenWave AI initialized — Bangalore grid online", highlight: false },
    { id: 1, time: "06:05:03", msg: "📡 BBMP signal API connected — 847 nodes active",    highlight: false },
    { id: 2, time: "06:05:08", msg: "⚡ Predictive corridor model loaded — v2.0",          highlight: false },
  ]);
  const idRef     = useRef(4);
  const containerRef = useRef(null);
  const prevAmbs  = useRef({});

  useEffect(() => {
    const now = new Date().toLocaleTimeString("en-US", { hour12: false });
    const allAmbs = Object.values(ambulances);
    allAmbs.forEach(amb => {
      const prev = prevAmbs.current[amb.id] ?? -1;
      if (amb.step === prev) return;
      prevAmbs.current[amb.id] = amb.step;

      const routeNames = amb.route?.name || "corridor";

      // Generate log entry at meaningful steps
      if (amb.step > 0 && amb.step % 15 === 0 && !amb.arrived) {
        const fn = AI_MESSAGES[Math.floor(Math.random() * (AI_MESSAGES.length - 2))];
        setLogs(l => [
          { id: idRef.current++, time: now, msg: fn(routeNames), highlight: true },
          ...l.slice(0, 19),
        ]);
      }
      if (amb.arrived && prev < 140) {
        setLogs(l => [
          { id: idRef.current++, time: now, msg: `✅ MISSION COMPLETE — ${routeNames} — ${Math.round(amb.time_saved/60)}m ${amb.time_saved%60}s saved`, highlight: true },
          ...l.slice(0, 19),
        ]);
      }
    });
  }, [ambulances]);

  // Auto-scroll to top when new log added
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [logs.length]);

  return (
    <div style={{ padding:"10px 14px", flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:"var(--text-dim)", letterSpacing:3, marginBottom:8 }}>
        ▶ GREENWAVE AI DECISION LOG
      </div>
      <div ref={containerRef} style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
        {logs.map(log => (
          <div key={log.id} style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:9, lineHeight:1.5,
            color: log.highlight ? "rgba(0,229,255,0.9)" : "rgba(255,255,255,0.35)",
            borderLeft: log.highlight ? "2px solid rgba(0,229,255,0.5)" : "2px solid transparent",
            paddingLeft:6, animation: log.highlight ? "fadeInDown 0.3s ease" : "none",
          }}>
            <span style={{ color:"rgba(255,255,255,0.2)", marginRight:6 }}>{log.time}</span>
            {log.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ activeCount, totalSaved, connected, speaking, autoDispatch, autoCountdown, onAutoToggle, tacticalMode, onTacticalToggle }) {
  const [time, setTime] = useState("--:--:--");
  const [missionElapsed, setMissionElapsed] = useState(0);
  const missionStart = useRef(null);

  useEffect(() => {
    if (activeCount > 0 && !missionStart.current) missionStart.current = Date.now();
    if (activeCount === 0) missionStart.current = null;
  }, [activeCount]);

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
      if (missionStart.current) {
        setMissionElapsed(Math.floor((Date.now() - missionStart.current) / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = s => `${Math.floor(s / 60)}m ${s % 60}s`;
  const fmtElapsed = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{ height:48, background:"var(--bg-panel)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0, position:"relative", overflow:"hidden" }}>
      {/* Scanline */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", opacity:0.04 }}>
        <div style={{ position:"absolute", width:"100%", height:2, background:"linear-gradient(transparent,var(--cyan),transparent)", animation:"scanline 5s linear infinite" }}/>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:activeCount>0?"var(--red)":"var(--green)", animation:activeCount>0?"pulse-red 0.8s infinite":"pulse-green 2s infinite" }}/>
          <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:700, color:"var(--cyan)", letterSpacing:4, textShadow:"0 0 20px var(--cyan),0 0 40px rgba(0,229,255,0.3)", animation:"flicker 8s infinite" }}>GREENWAVE</span>
        </div>
        <div style={{ width:1, height:20, background:"var(--border)" }}/>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"var(--text-dim)", letterSpacing:2 }}>BANGALORE EMERGENCY CORRIDOR v2.0</span>

        {/* Broadcasting badge */}
        {speaking && (
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(0,229,255,0.08)", border:"1px solid rgba(0,229,255,0.3)", borderRadius:20, padding:"3px 10px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--cyan)", animation:"blink 0.5s infinite" }}/>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"var(--cyan)", letterSpacing:1 }}>BROADCASTING</span>
          </div>
        )}

        {/* Mission timer — only shows when units are active */}
        {activeCount > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,34,68,0.08)", border:"1px solid rgba(255,34,68,0.3)", borderRadius:20, padding:"3px 10px", animation:"pulse-border 2s infinite" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--red)", animation:"blink 0.8s infinite" }}/>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"var(--red)", letterSpacing:1 }}>
              MISSION {fmtElapsed(missionElapsed)}
            </span>
          </div>
        )}

        {/* Auto-dispatch toggle */}
        <button onClick={onAutoToggle} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", background:autoDispatch?"rgba(255,170,0,0.12)":"rgba(255,255,255,0.03)", border:`1px solid ${autoDispatch?"rgba(255,170,0,0.5)":"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"3px 10px", transition:"all 0.2s" }}>
          {autoDispatch && <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--amber)", animation:"blink 1s infinite" }}/>}
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:autoDispatch?"var(--amber)":"var(--text-dim)", letterSpacing:1 }}>
            {autoDispatch ? `AUTO: ${String(Math.floor(autoCountdown/60)).padStart(2,"0")}:${String(autoCountdown%60).padStart(2,"0")}` : "AUTO DISPATCH"}
          </span>
        </button>

        {/* 3D Tactical Mode Toggle */}
        <button onClick={onTacticalToggle} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", background:tacticalMode?"rgba(0,255,136,0.12)":"rgba(255,255,255,0.03)", border:`1px solid ${tacticalMode?"rgba(0,255,136,0.5)":"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"3px 10px", transition:"all 0.2s", marginLeft: 4 }}>
          {tacticalMode && <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", animation:"blink 1s infinite", boxShadow:"var(--glow-green)" }}/>}
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:tacticalMode?"var(--green)":"var(--text-dim)", letterSpacing:1, textShadow:tacticalMode?"var(--glow-green)":"none" }}>
            3D TACTICAL
          </span>
        </button>
      </div>

      {/* Right stats */}
      <div style={{ display:"flex", gap:36, alignItems:"center" }}>
        {[
          ["CITY","BANGALORE"],
          ["ACTIVE", String(activeCount).padStart(2,"0")],
          ["SAVED",  fmt(totalSaved)],
          ["API",    "LIVE"],
          ["TIME",   time],
        ].map(([l,v]) => (
          <div key={l} style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"var(--text-dim)", letterSpacing:2 }}>{l}</span>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:700, fontVariantNumeric:"tabular-nums", color:
              l==="ACTIVE"&&activeCount>0?"var(--cyan)":
              (l==="SAVED"&&totalSaved>0)||l==="API"?"var(--green)":
              l==="TIME"?"var(--text-hi)":"var(--text-mid)",
              textShadow: (l==="ACTIVE"&&activeCount>0)?"var(--glow-cyan)":
                          (l==="SAVED"&&totalSaved>0)||l==="API"?"var(--glow-green)":
                          l==="TIME"?"0 0 10px rgba(255,255,255,0.2)":"none",
              animation:(l==="ACTIVE"&&activeCount>0)?"blink 1.5s infinite":"none"
            }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Boot Sequence ─────────────────────────────────────────────────────────────
function BootSequence({ onComplete }) {
  const [lines, setLines] = useState([]);
  
  const BOOT_TEXT = [
    "[conf: 99.9%] INITIALIZING GREENWAVE AI KERNEL v4.11.2...",
    "[conf: 98.2%] ESTABLISHING SECURE UPLINK TO BBMP TRAFFIC GRID...",
    "[conf: 95.7%] ENCRYPTING TELEMETRY HANDSHAKE [RSA-2048]...",
    "[conf: 92.4%] LOADING PREDICTIVE CONGESTION MODELS...",
    "[conf: 97.1%] BYPASSING STATIC SIGNAL SCHEDULES...",
    "[conf: 94.8%] CALIBRATING YOLOv8 LIVE CCTV FEEDS...",
    "[conf: 99.9%] SYSTEM SYNCHRONIZED. ACCESS GRANTED."
  ];

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      setLines(prev => [...prev, BOOT_TEXT[currentLine]]);
      currentLine++;
      if (currentLine >= BOOT_TEXT.length) {
        clearInterval(interval);
        setTimeout(onComplete, 800); // Wait a bit after last line before dismissing
      }
    }, 350); // fast paced boot text
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999, background:"#020408", 
      display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center",
      fontFamily:"'Share Tech Mono',monospace", color:"var(--green)",
      textShadow:"var(--glow-green)", overflow:"hidden"
    }}>
      <div style={{ width: 600, maxWidth: "90vw" }}>
        {/* Terminal Header */}
        <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px solid var(--green)", paddingBottom:8, marginBottom:24, opacity:0.6 }}>
          <span>GW-AI // TERMINAL</span>
          <span>SYS_BOOT</span>
        </div>
        
        {/* Boot Lines */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ fontSize: 13, letterSpacing: 1, animation: "ai-decision-in 0.2s ease" }}>
              <span style={{ opacity:0.5, marginRight:10 }}>[OK]</span> {line}
            </div>
          ))}
          {/* Blinking Cursor */}
          {lines.length < BOOT_TEXT.length && (
            <div style={{ fontSize: 14, animation: "blink 0.5s infinite" }}>_</div>
          )}
        </div>
        
        {/* Grid overlay for aesthetic */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(rgba(0,255,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,170,0.03) 1px, transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none", opacity:0.3 }}/>
      </div>
    </div>
  );
}

// ─── Live Impact Ticker ────────────────────────────────────────────────────────
function LiveImpactTicker({ ambulances }) {
  const all = Object.values(ambulances);
  if (all.length === 0) return null;

  const totalSaved  = all.reduce((s,a) => s + a.time_saved, 0);
  const cleared     = all.reduce((s,a) => s + a.signals.filter(sg => sg.state === "green" || sg.state === "done").length, 0);
  const arrived     = all.filter(a => a.arrived).length;
  const survived    = Math.min(Math.round((totalSaved / 60) * 10), 34); // Cap at 34% (AHA 10%/min rule)
  const successRate = all.length > 0 ? Math.round((arrived / all.length) * 100) : 0;

  const stats = [
    { label:"🫀 SURVIVAL GAIN",  value: survived,     suffix:"%", prefix:"+", color:"#00FF88" },
    { label:"⏱ MINS SAVED",     value: Math.round(totalSaved/60), suffix:"", prefix:"", color:"#00D4FF" },
    { label:"🟢 SIGS CLEARED",  value: cleared,       suffix:"", prefix:"", color:"#FFB020" },
    { label:"✅ SUCCESS RATE",  value: successRate,   suffix:"%", prefix:"", color:"#00FF88" },
    { label:"🚑 UNITS ACTIVE",  value: all.filter(a=>!a.arrived).length, suffix:"", prefix:"", color:"#FF2244" },
  ];

  return (
    <div style={{ height:32, background:"linear-gradient(90deg,rgba(0,5,15,0.98),rgba(0,18,40,0.95),rgba(0,5,15,0.98))", borderBottom:"1px solid rgba(0,255,170,0.3)", display:"flex", alignItems:"center", padding:"0 24px", gap:36, flexShrink:0, boxShadow:"0 2px 20px rgba(0,255,170,0.15)" }}>
      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:"rgba(0,255,170,0.45)", letterSpacing:3, whiteSpace:"nowrap", animation:"neon-pulse 3s infinite" }}>▶ LIVE IMPACT</span>
      {stats.map(s => (
        <div key={s.label} style={{ display:"flex", alignItems:"baseline", gap:5 }}>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:15, fontWeight:900, color:s.color, textShadow:`0 0 15px ${s.color}88`, fontVariantNumeric: "tabular-nums" }}>
            <AnimatedNumber value={s.value} prefix={s.prefix} suffix={s.suffix}/>
          </span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:"rgba(255,255,255,0.35)", whiteSpace:"nowrap" }}>{s.label}</span>
        </div>
      ))}
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", animation:"blink 1s infinite", boxShadow:"var(--glow-green)" }}/>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"var(--green)", letterSpacing:2, textShadow:"var(--glow-green)" }}>GREENWAVE AI ACTIVE</span>
      </div>
    </div>
  );
}

// ─── CINEMATIC ARRIVAL OVERLAY ─────────────────────────────────────────────────
// This is your WOW MOMENT. Full-screen, 4 seconds, then auto-dismisses.
function ArrivalOverlay({ event, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    // Generate mock TX hash
    const chars = "0123456789abcdef";
    let hash = "0x";
    for(let i=0; i<6; i++) hash += chars[Math.floor(Math.random()*16)];
    hash += "...";
    for(let i=0; i<4; i++) hash += chars[Math.floor(Math.random()*16)];
    setTxHash(hash);

    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 600); }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (!event) return null;
  const mins = Math.floor(event.timeSaved / 60);
  const secs = event.timeSaved % 60;
  const survivalBoost = Math.max(Math.min(Math.round((event.timeSaved / 60) * 10), 34), 1);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:10000, pointerEvents:"auto",
      display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(0,0,0,0.85)",
      opacity: visible ? 1 : 0,
      transition:"opacity 0.6s ease",
      backdropFilter:"blur(8px)",
    }} onClick={() => { setVisible(false); setTimeout(onDismiss, 600); }}>

      {/* Green radial glow */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center, rgba(0,255,136,0.12) 0%, transparent 70%)", pointerEvents:"none" }}/>

      {/* Content card */}
      <div style={{
        textAlign:"center", padding:"70px 90px", maxWidth:750,
        border:"1px solid rgba(0,255,170,0.5)",
        borderRadius:8,
        background:"linear-gradient(135deg, rgba(0,12,30,0.98) 0%, rgba(0,30,15,0.95) 100%)",
        boxShadow:"0 0 100px rgba(0,255,170,0.3), inset 0 0 50px rgba(0,255,170,0.1)",
        animation:"arrivalIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
      }}>

        {/* Checkmark */}
        <div style={{ fontSize:64, marginBottom:16, color:"var(--green)", textShadow:"var(--glow-green)", animation:"bounceIn 0.6s 0.1s both" }}>✓</div>

        {/* Title */}
        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:42, fontWeight:900, color:"var(--green)", letterSpacing:8, textShadow:"0 0 50px rgba(0,255,170,0.8), 0 0 100px rgba(0,255,170,0.4)", marginBottom:8, animation:"fadeUp 0.5s 0.2s both" }}>
          ARRIVED
        </div>

        {/* Destination */}
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:16, color:"rgba(255,255,255,0.7)", letterSpacing:3, marginBottom:36, animation:"fadeUp 0.5s 0.3s both" }}>
          {event.destination} — TIME CRITICAL COMPLETE
        </div>

        {/* 3 big stats */}
        <div style={{ display:"flex", gap:40, justifyContent:"center", marginBottom:32, animation:"fadeUp 0.5s 0.4s both" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:44, fontWeight:900, color:"#00D4FF", textShadow:"0 0 30px rgba(0,212,255,0.5)", lineHeight:1 }}>
              {mins}:{String(secs).padStart(2,"0")}
            </div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:3, marginTop:6 }}>MINUTES SAVED</div>
          </div>
          <div style={{ width:1, background:"rgba(255,255,255,0.1)" }}/>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:44, fontWeight:900, color:"#00FF88", textShadow:"0 0 30px rgba(0,255,136,0.5)", lineHeight:1 }}>
              +{survivalBoost}%
            </div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:3, marginTop:6 }}>SURVIVAL GAIN</div>
          </div>
          <div style={{ width:1, background:"rgba(255,255,255,0.1)" }}/>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:44, fontWeight:900, color:"#FFB020", textShadow:"0 0 30px rgba(255,176,32,0.5)", lineHeight:1 }}>
              {event.signalsCleared}
            </div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:3, marginTop:6 }}>SIGNALS CLEARED</div>
          </div>
        </div>

        {/* Route info */}
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"rgba(0,255,136,0.4)", letterSpacing:2, animation:"fadeUp 0.5s 0.5s both" }}>
          {event.route} · AUDIT LOG RECORDED · TX: {txHash}
        </div>

        {/* Dismiss hint */}
        <div style={{ marginTop:24, fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"rgba(255,255,255,0.15)", letterSpacing:2, animation:"blink 2s infinite" }}>
          CLICK TO DISMISS
        </div>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────
function RightPanel({ ambulances }) {
  const amb = Object.values(ambulances).find(a => !a.arrived) || Object.values(ambulances)[Object.values(ambulances).length - 1];

  return (
    <div style={{ width:310, background:"var(--bg-panel)", borderLeft:"1px solid var(--border)", display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden" }}>
      <div style={{ padding:"13px 18px", borderBottom:"1px solid var(--border)", fontFamily:"'Orbitron',monospace", fontSize:8, letterSpacing:3, color:"var(--text-dim)" }}>
        ANALYTICS + COMMS
      </div>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {amb && <MetricsPanel ambulances={ambulances} />}
        <CameraFeed dispatched={!!amb} />
        {/* Hacker Telemetry fills remaining space */}
        <LiveTelemetryTerminal activeAmbulances={Object.values(ambulances).filter(a => !a.arrived)} />
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [booted, setBooted] = useState(false);
  
  useEffect(() => {
    // Check session storage on mount
    const hasBooted = sessionStorage.getItem("gw_booted");
    if (hasBooted) {
      setBooted(true);
    } else {
      sessionStorage.setItem("gw_booted", "true");
    }

    // Ctrl+Shift+B replay shortcut
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        sessionStorage.removeItem("gw_booted");
        window.location.reload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { ambulances, dispatch: dispatchAmb, removeAmbulance, resetAll } = useMultiAmbulance();
  const { connected }    = useWebSocket();
  const { speak, speaking } = useVoice("");

  const [autoDispatch,  setAutoDispatch]  = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(45);
  const [dispatchFlash, setDispatchFlash] = useState(false);
  const [tacticalMode,  setTacticalMode]  = useState(false);

  // Arrival overlay state — queue of arrival events
  const [arrivalQueue, setArrivalQueue]   = useState([]);
  const [currentArrival, setCurrentArrival] = useState(null);

  const prevStepsRef  = useRef({});
  const autoTimerRef  = useRef(null);
  const autoCountRef  = useRef(45);
  const ROUTE_KEYS    = Object.keys(ROUTES);
  const AUTO_INTERVAL = 45;

  // Pop next from arrival queue
  useEffect(() => {
    if (!currentArrival && arrivalQueue.length > 0) {
      setCurrentArrival(arrivalQueue[0]);
      setArrivalQueue(q => q.slice(1));
    }
  }, [currentArrival, arrivalQueue]);

  // Auto-dispatch timer
  useEffect(() => {
    if (!autoDispatch) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoCountRef.current = AUTO_INTERVAL;
      setAutoCountdown(AUTO_INTERVAL);
      return;
    }
    autoCountRef.current = AUTO_INTERVAL;
    setAutoCountdown(AUTO_INTERVAL);
    autoTimerRef.current = setInterval(() => {
      autoCountRef.current -= 1;
      setAutoCountdown(autoCountRef.current);
      if (autoCountRef.current <= 0) {
        const rk    = ROUTE_KEYS[Math.floor(Math.random() * ROUTE_KEYS.length)];
        const route = ROUTES[rk];
        dispatchAmb(rk);
        speak(`Auto-dispatching ambulance on route ${route.name}`);
        autoCountRef.current = AUTO_INTERVAL;
        setAutoCountdown(AUTO_INTERVAL);
      }
    }, 1000);
    return () => clearInterval(autoTimerRef.current);
  }, [autoDispatch]);

  const handleAutoToggle = useCallback(() => setAutoDispatch(v => !v), []);
  const handleTacticalToggle = useCallback(() => setTacticalMode(v => !v), []);

  // Watch ambulances → voice + arrival overlay trigger
  useEffect(() => {
    Object.values(ambulances).forEach(amb => {
      const prev = prevStepsRef.current[amb.id] ?? -1;
      if (amb.step === prev) return;
      prevStepsRef.current[amb.id] = amb.step;

      amb.signals.forEach((sig, i) => {
        const arrival = Math.round((i / (amb.signals.length - 1)) * 140);
        if (amb.step === arrival - 20) {
          if (i === 0 || i === 3) speak(VOICE_SCRIPTS.signal_clear(sig.name));
        }
      });

      if (amb.step === 70 && prev < 70) speak(VOICE_SCRIPTS.halfway);

      if (amb.arrived && prev < 140) {
        speak(VOICE_SCRIPTS.arrival(amb.route.destination.name));

        // Queue the cinematic arrival overlay
        setArrivalQueue(q => [...q, {
          destination:   amb.route.destination.name,
          route:         amb.route.name,
          timeSaved:     amb.time_saved,
          signalsCleared: amb.signals.filter(s => s.state === "green" || s.state === "done").length,
        }]);
      }
    });
  }, [ambulances, speak]);

  const handleDispatch = useCallback((routeKey) => {
    const route = ROUTES[routeKey];
    dispatchAmb(routeKey);
    speak(VOICE_SCRIPTS.dispatch(route.name));
    setDispatchFlash(true);
    setTimeout(() => setDispatchFlash(false), 900);
  }, [dispatchAmb, speak]);

  const handleResetAll = useCallback(() => {
    resetAll();
    prevStepsRef.current = {};
  }, [resetAll]);

  const allAmbs    = Object.values(ambulances);
  const activeAmbs = allAmbs.filter(a => !a.arrived);
  const mapAmb     = activeAmbs[activeAmbs.length - 1] || allAmbs[allAmbs.length - 1];
  const mapSnapshot = mapAmb ? { step:mapAmb.step, signals:mapAmb.signals, vehicle:mapAmb.vehicle, eta:mapAmb.eta, time_saved:mapAmb.time_saved, progress:mapAmb.progress, arrived:mapAmb.arrived } : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", background:"var(--bg-void)", position:"relative" }}>
      {!booted && <BootSequence onComplete={() => setBooted(true)} />}

      {/* ── Dispatch Flash (tactical, not screaming) ── */}
      {dispatchFlash && (
        <div style={{
          position:"fixed", inset:0, zIndex:9999, pointerEvents:"none",
          animation:"dispatch-flash 0.9s ease forwards",
        }}>
          {/* Left edge bar */}
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:4, background:"linear-gradient(180deg,transparent,var(--red),transparent)", animation:"dispatch-flash 0.9s ease forwards" }}/>
          {/* Right edge bar */}
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:4, background:"linear-gradient(180deg,transparent,var(--red),transparent)", animation:"dispatch-flash 0.9s ease forwards" }}/>
          {/* Top banner */}
          <div style={{ position:"absolute", top:48, left:"50%", transform:"translateX(-50%)", textAlign:"center", background:"rgba(229,25,58,0.95)", padding:"10px 40px", borderRadius:"0 0 8px 8px", borderTop:"none", border:"1px solid rgba(255,80,100,0.5)" }}>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, fontWeight:900, color:"#fff", letterSpacing:6 }}>🚨 UNIT DISPATCHED</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"rgba(255,200,200,0.8)", letterSpacing:4, marginTop:3 }}>GREENWAVE AI CORRIDOR ACTIVATING</div>
          </div>
        </div>
      )}

      {/* ── Cinematic Arrival Overlay ── */}
      {currentArrival && (
        <ArrivalOverlay
          event={currentArrival}
          onDismiss={() => setCurrentArrival(null)}
        />
      )}

      <Topbar
        activeCount={activeAmbs.length}
        totalSaved={allAmbs.reduce((s,a) => s + a.time_saved, 0)}
        connected={connected}
        speaking={speaking}
        autoDispatch={autoDispatch}
        autoCountdown={autoCountdown}
        onAutoToggle={handleAutoToggle}
        tacticalMode={tacticalMode}
        onTacticalToggle={handleTacticalToggle}
      />

      <LiveImpactTicker ambulances={ambulances}/>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <DispatchPanel ambulances={ambulances} onDispatch={handleDispatch} onRemove={removeAmbulance} onResetAll={handleResetAll}/>
        <MapView 
          dispatched={!!mapAmb} 
          arrived={mapAmb?.arrived??false} 
          snapshot={mapSnapshot} 
          selectedRoute={mapAmb?.routeKey??"route1"} 
          allAmbulances={ambulances}
          tacticalMode={tacticalMode}
        />
        <RightPanel ambulances={ambulances}/>
      </div>
    </div>
  );
}
