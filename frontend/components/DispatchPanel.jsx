"use client";
import { useState } from "react";
import { BANGALORE_ROUTES } from "@/lib/bangaloreRoutes";

function AmbulanceCard({ amb, onRemove }) {
  const fmt     = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const cleared = amb.signals.filter(s => s.state === "green" || s.state === "done").length;
  const isActive= !amb.arrived;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: `1px solid ${amb.arrived ? "var(--green-dim)" : isActive ? "rgba(255,34,68,0.3)" : "var(--border)"}`,
      borderRadius: 4, padding: "12px",
      animation: isActive && !amb.arrived ? "border-glow 2s infinite" : "none",
      transition: "all 0.4s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:7, height:7, borderRadius:"50%",
            background: amb.arrived ? "var(--green)" : isActive ? "var(--red)" : "var(--text-dim)",
            animation: isActive ? "pulse-red 0.8s infinite" : amb.arrived ? "pulse-green 2s infinite" : "none",
          }}/>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11, fontWeight:700, color:"var(--text-hi)", letterSpacing:2 }}>
            {amb.id}
          </span>
          <span style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:8,
            color: amb.arrived ? "var(--green)" : isActive ? "var(--amber)" : "var(--text-dim)",
            animation: isActive ? "blink 2s infinite" : "none",
          }}>
            {amb.arrived ? "ARRIVED" : isActive ? "EN ROUTE" : "STANDBY"}
          </span>
        </div>
        <button onClick={() => onRemove(amb.id)} style={{
          background:"transparent", border:"1px solid var(--border)", borderRadius:2,
          padding:"2px 6px", cursor:"pointer", fontFamily:"'Share Tech Mono',monospace",
          fontSize:9, color:"var(--text-dim)", transition:"all 0.2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--red)";e.currentTarget.style.color="var(--red)"}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text-dim)"}}>
          ✕
        </button>
      </div>

      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"var(--text-dim)", marginBottom:7, letterSpacing:1 }}>
        {amb.route.name}
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:"var(--bg-void)", borderRadius:2, overflow:"hidden", marginBottom:8 }}>
        <div style={{
          height:"100%", width:`${amb.progress}%`,
          background:"linear-gradient(90deg,var(--green-dim),var(--green))",
          borderRadius:2, transition:"width 0.3s",
          boxShadow: isActive ? "0 0 6px var(--green)" : "none",
        }}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4 }}>
        {[
          ["ETA",     fmt(amb.eta),              amb.eta < 120 ? "var(--amber)" : "var(--text-hi)"],
          ["SAVED",   fmt(amb.time_saved),        "var(--green)"],
          ["SPEED",   `${amb.vehicle?.speed??0}`, "var(--cyan)"],
          ["CLR",     `${cleared}/7`,             "var(--amber)"],
        ].map(([k,v,c]) => (
          <div key={k} style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:6, color:"var(--text-dim)", letterSpacing:1, marginBottom:2 }}>{k}</div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:600, color:c, lineHeight:1 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DispatchPanel({ ambulances, onDispatch, onRemove, onResetAll }) {
  const [selectedRoute, setSelectedRoute] = useState("route1");
  const ambList = Object.values(ambulances);

  return (
    <div style={{
      width:268, background:"var(--bg-panel)", borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden",
    }}>
      <div style={{ padding:"13px 18px", borderBottom:"1px solid var(--border)", fontFamily:"'Orbitron',monospace", fontSize:8, letterSpacing:3, color:"var(--text-dim)" }}>
        DISPATCH CONTROL
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:15, display:"flex", flexDirection:"column", gap:12 }}>

        {/* Route selector */}
        <div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:"var(--text-dim)", marginBottom:7 }}>▸ SELECT ROUTE</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {Object.entries(BANGALORE_ROUTES).map(([key, r]) => (
              <button key={key} onClick={() => setSelectedRoute(key)} style={{
                background: selectedRoute===key ? "rgba(0,229,255,0.07)" : "var(--bg-card)",
                border: `1px solid ${selectedRoute===key ? "var(--cyan)" : "var(--border)"}`,
                borderRadius:3, padding:"8px 10px", cursor:"pointer", textAlign:"left", transition:"all 0.2s",
              }}>
                <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:selectedRoute===key?"var(--cyan)":"var(--text-mid)" }}>
                  {selectedRoute===key ? "▶ " : ""}{r.name}
                </div>
                <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:"var(--text-dim)", marginTop:2 }}>
                  {r.origin.name.split("(")[0].trim()} · {r.waypoints.length} signals
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Origin / Dest display */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--border-hi)", borderRadius:3, padding:"8px 11px" }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:"var(--text-dim)", letterSpacing:2, marginBottom:3 }}>ORIGIN</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"var(--cyan)" }}>
              📍 {BANGALORE_ROUTES[selectedRoute].origin.name}
            </div>
          </div>
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--green-dim)", borderRadius:3, padding:"8px 11px" }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:"var(--text-dim)", letterSpacing:2, marginBottom:3 }}>DESTINATION</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"var(--green)" }}>
              🏥 {BANGALORE_ROUTES[selectedRoute].destination.name}
            </div>
          </div>
        </div>

        {/* Dispatch button */}
        <button onClick={() => onDispatch(selectedRoute)} style={{
          background:"linear-gradient(135deg,#6b0000,var(--red))",
          border:"1px solid var(--red)", borderRadius:3, padding:"13px",
          cursor:"pointer", width:"100%", fontFamily:"'Orbitron',sans-serif",
          fontSize:13, fontWeight:700, color:"#fff", letterSpacing:3,
          boxShadow:"0 0 30px rgba(255,34,68,0.35)", transition:"box-shadow 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow="0 0 55px rgba(255,34,68,0.7)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow="0 0 30px rgba(255,34,68,0.35)"}>
          🚨 DISPATCH AMB
        </button>

        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"var(--text-dim)", textAlign:"center", letterSpacing:1 }}>
          ↑ dispatch multiple simultaneously
        </div>

        {/* Active units */}
        {ambList.length > 0 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:"var(--text-dim)" }}>
                ACTIVE UNITS ({ambList.length})
              </span>
              <button onClick={onResetAll} style={{
                background:"transparent", border:"1px solid var(--border)", borderRadius:2,
                padding:"2px 8px", cursor:"pointer", fontFamily:"'Share Tech Mono',monospace",
                fontSize:8, color:"var(--text-dim)", letterSpacing:1, transition:"all 0.2s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--red)";e.currentTarget.style.color="var(--red)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text-dim)"}}>
                RESET ALL
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {ambList.map(amb => (
                <AmbulanceCard key={amb.id} amb={amb} onRemove={onRemove} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}