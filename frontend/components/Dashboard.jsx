"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

import { BANGALORE_ROUTES }        from "@/lib/bangaloreRoutes";
import { useMultiAmbulance }       from "@/hooks/useMultiAmbulance";
import { useVoice, VOICE_SCRIPTS } from "@/hooks/useVoice";
import { useWebSocket }            from "@/hooks/useWebSocket";

import DispatchPanel from "@/components/DispatchPanel";
import MetricsPanel  from "@/components/MetricsPanel";
import SignalGrid    from "@/components/SignalGrid";
import LiveLog       from "@/components/LiveLog";
import VoiceAlert    from "@/components/VoiceAlert";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ activeCount, totalSaved, connected, speaking }) {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  const fmt = s => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div style={{ height:48,background:"var(--bg-panel)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0,position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",opacity:0.04 }}>
        <div style={{ position:"absolute",width:"100%",height:2,background:"linear-gradient(transparent,var(--cyan),transparent)",animation:"scanline 5s linear infinite" }}/>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:16 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:8,height:8,borderRadius:"50%",background:activeCount>0?"var(--red)":"var(--green)",animation:activeCount>0?"pulse-red 0.8s infinite":"pulse-green 2s infinite" }}/>
          <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,color:"var(--cyan)",letterSpacing:4,textShadow:"0 0 20px var(--cyan),0 0 40px rgba(0,229,255,0.3)",animation:"flicker 8s infinite" }}>GREENWAVE</span>
        </div>
        <div style={{ width:1,height:20,background:"var(--border)" }}/>
        <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"var(--text-dim)",letterSpacing:2 }}>BANGALORE EMERGENCY CORRIDOR v2.0</span>
        {speaking && (
          <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(0,229,255,0.08)",border:"1px solid rgba(0,229,255,0.3)",borderRadius:20,padding:"3px 10px" }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:"var(--cyan)",animation:"blink 0.5s infinite" }}/>
            <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"var(--cyan)",letterSpacing:1 }}>BROADCASTING</span>
          </div>
        )}
      </div>
      <div style={{ display:"flex",gap:28,alignItems:"center" }}>
        {[["CITY","BANGALORE"],["ACTIVE",String(activeCount).padStart(2,"0")],["SAVED",fmt(totalSaved)],["API",connected?"LIVE":"OFFLINE"],["TIME",time]].map(([l,v])=>(
          <div key={l} style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:7,color:"var(--text-dim)",letterSpacing:2 }}>{l}</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:l==="ACTIVE"&&activeCount>0?"var(--red)":l==="SAVED"&&totalSaved>0?"var(--green)":l==="API"?(connected?"var(--green)":"var(--red)"):l==="TIME"?"var(--cyan)":"var(--text-mid)",animation:(l==="ACTIVE"&&activeCount>0)||(l==="API"&&!connected)?"blink 1.2s infinite":"none" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────
function RightPanel({ ambulances, logs, speaking, voiceEnabled, onVoiceToggle, lastAlert, elevenlabsKey, onKeyChange }) {
  const amb = Object.values(ambulances).find(a => !a.arrived) || Object.values(ambulances)[Object.values(ambulances).length - 1];

  return (
    <div style={{ width:284,background:"var(--bg-panel)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden" }}>
      <div style={{ padding:"13px 18px",borderBottom:"1px solid var(--border)",fontFamily:"'Orbitron',monospace",fontSize:8,letterSpacing:3,color:"var(--text-dim)" }}>
        ANALYTICS
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:15,display:"flex",flexDirection:"column",gap:14 }}>

        <MetricsPanel ambulances={ambulances} />

        {amb && (
          <div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:2,color:"var(--text-dim)",marginBottom:8 }}>
              INTERSECTION STATUS
            </div>
            <SignalGrid signals={amb.signals} />
          </div>
        )}

        <LiveLog logs={logs} />

        <VoiceAlert
          speaking={speaking}
          enabled={voiceEnabled}
          onToggle={onVoiceToggle}
          lastAlert={lastAlert}
          apiKey={elevenlabsKey}
          onKeyChange={onKeyChange}
        />

      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { ambulances, dispatch: dispatchAmb, removeAmbulance, resetAll } = useMultiAmbulance();
  const { connected }   = useWebSocket();
  const { speak, speaking, enabled: voiceEnabled, toggle: voiceToggle }  = useVoice("");

  const [logs,          setLogs]          = useState([]);
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [lastAlert,     setLastAlert]     = useState("");
  const prevStepsRef    = useRef({});

  // Watch ambulances → logs + voice
  useEffect(() => {
    Object.values(ambulances).forEach(amb => {
      const prev = prevStepsRef.current[amb.id] ?? -1;
      if (amb.step === prev) return;
      prevStepsRef.current[amb.id] = amb.step;

      amb.signals.forEach((sig, i) => {
        const arrival = Math.round((i / (amb.signals.length - 1)) * 140);
        if (amb.step === arrival - 20) {
          setLogs(l => [...l.slice(-80), { text:`▶ [${amb.id}] PRE-CLEAR: ${sig.name}`, type:"green" }]);
          if (i === 0 || i === 3) { const s = VOICE_SCRIPTS.signal_clear(sig.name); speak(s); setLastAlert(s); }
        }
        if (amb.step === arrival) {
          setLogs(l => [...l.slice(-80), { text:`✓ [${amb.id}] PASSING: ${sig.name}`, type:"info" }]);
        }
      });

      if (amb.step === 70 && prev < 70) {
        speak(VOICE_SCRIPTS.halfway); setLastAlert(VOICE_SCRIPTS.halfway);
        setLogs(l => [...l.slice(-80), { text:`[${amb.id}] Halfway point reached`, type:"info" }]);
      }

      if (amb.arrived && prev < 140) {
        const s = VOICE_SCRIPTS.arrival(amb.route.destination.name);
        speak(s); setLastAlert(s);
        setLogs(l => [...l.slice(-80), { text:`🏥 [${amb.id}] ARRIVED — ${amb.route.destination.name}`, type:"green" }]);
      }
    });
  }, [ambulances, speak]);

  const handleDispatch = useCallback((routeKey) => {
    const route = BANGALORE_ROUTES[routeKey];
    dispatchAmb(routeKey);
    const s = VOICE_SCRIPTS.dispatch(route.name);
    speak(s); setLastAlert(s);
    setLogs(l => [...l.slice(-80),
      { text:`🚨 DISPATCH — ${route.origin.name}`, type:"alert" },
      { text:`▸ ROUTE: ${route.name}`,              type:"info"  },
      { text:`▸ Loading road geometry via OSRM...`, type:"info"  },
    ]);
  }, [dispatchAmb, speak]);

  const handleResetAll = useCallback(() => {
    resetAll(); setLogs([]); setLastAlert(""); prevStepsRef.current = {};
  }, [resetAll]);

  const allAmbs    = Object.values(ambulances);
  const activeAmbs = allAmbs.filter(a => !a.arrived);
  const mapAmb     = activeAmbs[activeAmbs.length - 1] || allAmbs[allAmbs.length - 1];
  const mapSnapshot= mapAmb ? { step:mapAmb.step, signals:mapAmb.signals, vehicle:mapAmb.vehicle, eta:mapAmb.eta, time_saved:mapAmb.time_saved, progress:mapAmb.progress, arrived:mapAmb.arrived } : null;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",background:"var(--bg-void)" }}>
      <Topbar activeCount={activeAmbs.length} totalSaved={allAmbs.reduce((s,a)=>s+a.time_saved,0)} connected={connected} speaking={speaking}/>
      <div style={{ display:"flex",flex:1,overflow:"hidden" }}>
        <DispatchPanel ambulances={ambulances} onDispatch={handleDispatch} onRemove={removeAmbulance} onResetAll={handleResetAll}/>
        <MapView dispatched={!!mapAmb} arrived={mapAmb?.arrived??false} snapshot={mapSnapshot} selectedRoute={mapAmb?.routeKey??"route1"} allAmbulances={ambulances}/>
        <RightPanel ambulances={ambulances} logs={logs} speaking={speaking} voiceEnabled={voiceEnabled} onVoiceToggle={voiceToggle} lastAlert={lastAlert} elevenlabsKey={elevenlabsKey} onKeyChange={setElevenlabsKey}/>
      </div>
    </div>
  );
}