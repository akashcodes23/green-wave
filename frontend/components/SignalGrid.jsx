"use client";

export default function SignalGrid({ signals }) {
  if (!signals || signals.length === 0) {
    return (
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"var(--text-dim)", opacity:0.4, textAlign:"center", padding:"12px 0" }}>
        — no active corridor —
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {signals.map((sig, i) => {
        const col =
          sig.state === "green" ? "var(--green)" :
          sig.state === "done"  ? "var(--green-dim)" :
          sig.state === "red"   ? "var(--red)" : "var(--text-dim)";
        const bg =
          sig.state === "green" ? "rgba(0,255,136,0.06)" :
          sig.state === "red"   ? "rgba(255,34,68,0.04)" : "var(--bg-card)";
        const bd =
          sig.state === "green" ? "rgba(0,255,136,0.35)" :
          sig.state === "red"   ? "rgba(255,34,68,0.2)" : "var(--border)";

        return (
          <div key={i} style={{
            background: bg, border:`1px solid ${bd}`, borderRadius:3,
            padding:"7px 10px", display:"flex", justifyContent:"space-between",
            alignItems:"center", transition:"all 0.4s",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* Node number */}
              <div style={{
                width:16, height:16, borderRadius:2,
                background:"var(--bg-void)", border:`1px solid ${bd}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Orbitron',monospace", fontSize:7, color:col, flexShrink:0,
              }}>
                {i + 1}
              </div>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:col }}>
                {sig.name}
              </span>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:7, color:col, letterSpacing:1 }}>
                {sig.state === "idle" ? "IDLE" : sig.state.toUpperCase()}
              </span>
              <div style={{
                width:6, height:6, borderRadius:"50%", background:col,
                animation:
                  sig.state === "green" ? "pulse-green 1s infinite" :
                  sig.state === "red"   ? "pulse-red 1.2s infinite" : "none",
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}