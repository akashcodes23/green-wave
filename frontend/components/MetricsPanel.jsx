"use client";

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function MetricsPanel({ ambulances }) {
  const allAmbs    = Object.values(ambulances);
  const amb        = allAmbs.find(a => !a.arrived) || allAmbs[allAmbs.length - 1];
  const totalSaved = allAmbs.reduce((s, a) => s + a.time_saved, 0);
  const totalClear = allAmbs.reduce((s, a) => s + a.signals.filter(sg => sg.state === "green" || sg.state === "done").length, 0);

  if (!amb) {
    return (
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"var(--text-dim)", textAlign:"center", padding:"30px 0", lineHeight:2 }}>
        No active units.<br/>Dispatch an ambulance<br/>to begin.
      </div>
    );
  }

  const cleared = amb.signals.filter(s => s.state === "green" || s.state === "done").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Tracking label */}
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:"var(--text-dim)" }}>
        TRACKING: <span style={{ color:"var(--cyan)" }}>{amb.id}</span>
        <span style={{ color:"var(--text-dim)", marginLeft:8 }}>·</span>
        <span style={{ color: amb.arrived?"var(--green)":!amb.arrived?"var(--amber)":"var(--text-dim)", marginLeft:8, animation:!amb.arrived?"blink 2s infinite":"none" }}>
          {amb.arrived ? "ARRIVED" : "EN ROUTE"}
        </span>
      </div>

      {/* Big ETA + Time Saved */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { label:"ETA",        value:fmt(amb.eta),        color:amb.eta<120?"var(--amber)":"var(--text-hi)", glow:false },
          { label:"TIME SAVED", value:fmt(amb.time_saved), color:"var(--green)", glow:true },
        ].map(m => (
          <div key={m.label} style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:4, padding:"13px 11px" }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, letterSpacing:2, color:"var(--text-dim)", marginBottom:5 }}>{m.label}</div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:27, fontWeight:700, lineHeight:1, color:m.color, textShadow:m.glow?"0 0 18px var(--green)":"none" }}>
              {m.value}
            </div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:"var(--text-dim)", marginTop:4 }}>MIN:SEC</div>
          </div>
        ))}
      </div>

      {/* Speed / Progress / Cleared */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {[
          { label:"SPEED",    value:`${amb.vehicle?.speed ?? 0}`, sub:"KM/H",    color:"var(--cyan)" },
          { label:"PROGRESS", value:`${amb.progress}%`,           sub:"DONE",    color:"var(--amber)" },
          { label:"CLEARED",  value:`${cleared}/7`,               sub:"SIGNALS", color:"var(--green)" },
        ].map(m => (
          <div key={m.label} style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:4, padding:"10px 8px" }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:6, letterSpacing:2, color:"var(--text-dim)", marginBottom:4 }}>{m.label}</div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:600, color:m.color, lineHeight:1 }}>{m.value}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:6, color:"var(--text-dim)", marginTop:3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Survival gain bar */}
      {allAmbs.length > 0 && totalSaved > 0 && (
        <div style={{ background:"var(--bg-card)", border:"1px solid rgba(0,255,136,0.1)", borderRadius:4, padding:"11px 12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:1, color:"var(--text-dim)" }}>SURVIVAL PROBABILITY GAIN</span>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:"var(--green)" }}>
              +{Math.round((totalSaved / 60) * 7)}%
            </span>
          </div>
          <div style={{ height:4, background:"var(--bg-void)", borderRadius:2, overflow:"hidden" }}>
            <div style={{
              height:"100%",
              width:`${Math.min((totalSaved / 60) * 7, 45)}%`,
              background:"linear-gradient(90deg,var(--green-dim),var(--green))",
              borderRadius:2, transition:"width 0.5s",
              boxShadow:"0 0 8px var(--green)",
            }}/>
          </div>
        </div>
      )}

      {/* Fleet summary — only if multiple ambulances */}
      {allAmbs.length > 1 && (
        <div style={{ background:"var(--bg-card)", border:"1px solid rgba(0,229,255,0.1)", borderRadius:4, padding:"12px" }}>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:7, letterSpacing:3, color:"var(--cyan-dim)", marginBottom:8 }}>FLEET SUMMARY</div>
          {[
            ["TOTAL UNITS",      `${allAmbs.length}`,                          "var(--text-hi)"],
            ["ARRIVED",          `${allAmbs.filter(a=>a.arrived).length}`,      "var(--green)"],
            ["TOTAL TIME SAVED", fmt(totalSaved),                               "var(--green)"],
            ["SIGNALS CLEARED",  `${totalClear}`,                               "var(--amber)"],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"var(--text-dim)" }}>{k}</span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:c }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI prediction */}
      <div style={{ background:"var(--bg-card)", border:"1px solid rgba(0,229,255,0.08)", borderRadius:4, padding:"12px" }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:7, letterSpacing:3, color:"var(--cyan-dim)", marginBottom:7 }}>⚡ AI PREDICTION</div>
        <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:12, color:"var(--text-mid)", lineHeight:1.6 }}>
          {allAmbs.some(a => !a.arrived)
            ? `▸ ${allAmbs.filter(a=>!a.arrived).length} active corridor(s). ${totalClear} intersections pre-cleared. Est. survival improvement: +${Math.round((totalSaved/60)*7)}%.`
            : `▸ All units arrived. Total time saved: ${fmt(totalSaved)}. Mission success.`
          }
        </div>
      </div>
    </div>
  );
}