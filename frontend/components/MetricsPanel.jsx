"use client";

import { useRef, useEffect, useState } from "react";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ─── Mini SVG sparkline (pure, no lib) ───────────────────────────────────────
function Sparkline({ values, width = 220, height = 36, color = "#00FF88" }) {
  if (!values || values.length < 2) {
    return <div style={{ height, background: "rgba(0,255,136,0.04)", borderRadius: 3 }} />;
  }
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const areaPath = [
    `M 0,${height}`,
    ...values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `L ${x.toFixed(1)},${y.toFixed(1)}`;
    }),
    `L ${width},${height} Z`,
  ].join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* Latest value dot */}
      {(() => {
        const last = values[values.length - 1];
        const x = width;
        const y = height - (last / max) * (height - 4) - 2;
        return <circle cx={x} cy={y} r="2.5" fill={color} />;
      })()}
    </svg>
  );
}

// ─── Removed Base StateBadge (Now handled on map) ──────────────────────────────

// ─── ETA comparison bars ──────────────────────────────────────────────────────
function EtaBar({ label, seconds, maxSeconds, color }) {
  const pct = Math.min((seconds / maxSeconds) * 100, 100);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: "#8ec5fc" }}>{label}</span>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, color }}>{fmt(seconds)}</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-void)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: color, borderRadius: 2,
          transition: "width 0.5s", boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
    </div>
  );
}

// ─── Before vs After animated impact panel ────────────────────────────────────
function BeforeAfterCard({ etaBase, etaNow, timeSaved }) {
  const pctBase = 100;
  const pctNow  = etaBase > 0 ? Math.min((etaNow / etaBase) * 100, 100) : 50;
  const survival = Math.round((timeSaved / 60) * 7.2);
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 4, padding: "11px 12px" }}>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 7, letterSpacing: 3, color: "var(--cyan-dim)", marginBottom: 9 }}>
        BEFORE vs AFTER IMPACT
      </div>
      {/* WITHOUT GREENWAVE row */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: "var(--red)" }}>⛔ WITHOUT GREENWAVE</span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, color: "var(--red)" }}>{fmt(etaBase)}</span>
        </div>
        <div style={{ height: 6, background: "var(--bg-void)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pctBase}%`, background: "linear-gradient(90deg,#5a0010,var(--red))", borderRadius: 3, boxShadow: "0 0 8px rgba(255,34,68,0.4)" }} />
        </div>
      </div>
      {/* WITH GREENWAVE row */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: "var(--green)" }}>✅ WITH GREENWAVE</span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, color: "var(--green)", animation: "odometer 0.3s ease" }}>{fmt(etaNow)}</span>
        </div>
        <div style={{ height: 6, background: "var(--bg-void)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pctNow}%`, background: "linear-gradient(90deg,var(--green-dim),var(--green))", borderRadius: 3, transition: "width 0.6s cubic-bezier(.4,0,.2,1)", boxShadow: "0 0 8px rgba(0,255,136,0.4)" }} />
        </div>
      </div>
      {/* Δ Time saved */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: "var(--text-dim)" }}>Δ TIME SAVED</span>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 14, color: "var(--green)", fontWeight: 700, textShadow: "0 0 12px var(--green)", animation: "odometer 0.3s ease" }}>
          {fmt(timeSaved)}
        </span>
      </div>
      {survival > 0 && (
        <div style={{ marginTop: 7, padding: "6px 8px", background: "rgba(0,255,136,0.06)", borderRadius: 3, border: "1px solid rgba(0,255,136,0.12)" }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: "var(--text-dim)" }}>SURVIVAL PROB GAIN · </span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, color: "var(--green)", fontWeight: 700 }}>+{survival}%</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: "var(--text-dim)" }}> per min saved</span>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
export default function MetricsPanel({ ambulances }) {
  const allAmbs    = Object.values(ambulances);
  const amb        = allAmbs.find(a => !a.arrived) || allAmbs[allAmbs.length - 1];
  const totalSaved = allAmbs.reduce((s, a) => s + a.time_saved, 0);
  const totalClear = allAmbs.reduce(
    (s, a) => s + a.signals.filter(sg => sg.state === "green" || sg.state === "done").length, 0
  );

  // ── Sparkline history buffer ──────────────────────────────────────────────
  const historyRef = useRef([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!amb) return;
    historyRef.current = [...historyRef.current.slice(-29), amb.time_saved];
    setHistory([...historyRef.current]);
  }, [amb?.time_saved]);

  // ── Signal times removed (Map handles visual state) ─────────────────────

  if (!amb) {
    return (
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: "var(--text-dim)", textAlign: "center", padding: "30px 0", lineHeight: 2 }}>
        No active units.<br />Dispatch an ambulance<br />to begin.
      </div>
    );
  }

  const cleared      = amb.signals.filter(s => s.state === "green" || s.state === "done").length;
  const efficiency   = Math.round((cleared / amb.signals.length) * 100 * (Math.min(amb.vehicle?.speed ?? 60, 80) / 80));
  const etaBase      = Math.round(amb.eta + amb.time_saved); // estimated without GreenWave
  const survivalGain = Math.round((totalSaved / 60) * 7);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Tracking Header & Live Stats (Streamlined) ────────────────── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "10px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 2, color: "var(--text-dim)" }}>
            UNIT: <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{amb.id}</span>
          </div>
          <div style={{
            fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 1,
            color: amb.arrived ? "var(--green)" : "var(--amber)",
            background: amb.arrived ? "rgba(0,255,136,0.1)" : "rgba(255,170,0,0.1)",
            padding: "2px 8px", borderRadius: 12, border: `1px solid ${amb.arrived ? "rgba(0,255,136,0.2)" : "rgba(255,170,0,0.2)"}`,
            animation: !amb.arrived ? "blink 2s infinite" : "none",
          }}>
            {amb.arrived ? "ARRIVED" : "RESPONDING"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--cyan)" }}>{amb.vehicle?.speed ?? 0}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 6, color: "var(--text-dim)", letterSpacing: 1 }}>KM/H</div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--amber)" }}>{amb.progress}%</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 6, color: "var(--text-dim)", letterSpacing: 1 }}>ROUTE DONE</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--green)" }}>{cleared}/{amb.signals.length}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 6, color: "var(--text-dim)", letterSpacing: 1 }}>SIGS CLR</div>
          </div>
        </div>
      </div>

      {/* ── Time Saved sparkline ──────────────────────────────────────── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 4, padding: "10px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 1, color: "var(--text-dim)" }}>
            TIME SAVED TREND
          </span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, color: "var(--green)" }}>
            {fmt(amb.time_saved)}
          </span>
        </div>
        <Sparkline values={history} color="#00FF88" width={220} height={34} />
      </div>

      {/* ── ETA comparison ───────────────────────────────────────────── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 4, padding: "10px 12px" }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 1, color: "var(--text-dim)", marginBottom: 8 }}>
          ETA COMPARISON
        </div>
        <EtaBar label="WITHOUT GREENWAVE" seconds={etaBase}   maxSeconds={etaBase}   color="#FF2D55" />
        <EtaBar label="WITH GREENWAVE"    seconds={amb.eta}   maxSeconds={etaBase}   color="#00FF88" />
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: "var(--green)", textAlign: "right", marginTop: 2 }}>
          Saving {fmt(amb.time_saved)} ↑
        </div>
      </div>

      {/* ── Before vs After animated impact ──────────────────────────── */}
      <BeforeAfterCard etaBase={etaBase} etaNow={amb.eta} timeSaved={amb.time_saved} />

      {/* ── Removed Intersection Status Grid ───────────────────────────── */}

      {/* ── Corridor efficiency score ──────────────────────────────── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 4, padding: "11px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 1, color: "var(--text-dim)" }}>
            CORRIDOR EFFICIENCY
          </span>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 12, color: efficiency > 60 ? "var(--green)" : "var(--amber)", fontWeight: 700 }}>
            {efficiency}
          </span>
        </div>
        <div style={{ height: 4, background: "var(--bg-void)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
          <div style={{
            height: "100%", width: `${efficiency}%`,
            background: `linear-gradient(90deg, ${efficiency > 60 ? "var(--green-dim)" : "#7a3010"}, ${efficiency > 60 ? "var(--green)" : "var(--amber)"})`,
            borderRadius: 2, transition: "width 0.5s",
            boxShadow: `0 0 8px ${efficiency > 60 ? "var(--green)" : "var(--amber)"}`,
          }} />
        </div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: "var(--text-dim)" }}>
          SCORE = signals_cleared × speed_factor out of 100
        </div>
      </div>

      {/* ── Survival probability gain ────────────────────────────────── */}
      {totalSaved > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 4, padding: "11px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 1, color: "var(--text-dim)" }}>SURVIVAL PROBABILITY GAIN</span>
            <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, color: "var(--green)" }}>+{survivalGain}%</span>
          </div>
          <div style={{ height: 4, background: "var(--bg-void)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(survivalGain, 45)}%`,
              background: "linear-gradient(90deg,var(--green-dim),var(--green))",
              borderRadius: 2, transition: "width 0.5s", boxShadow: "0 0 8px var(--green)",
            }} />
          </div>
        </div>
      )}

      {/* ── Fleet summary ─────────────────────────────────────────────── */}
      {allAmbs.length > 1 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 4, padding: "12px" }}>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 7, letterSpacing: 3, color: "var(--cyan-dim)", marginBottom: 8 }}>FLEET SUMMARY</div>
          {[
            ["TOTAL UNITS",     `${allAmbs.length}`,                          "var(--text-hi)"],
            ["ARRIVED",         `${allAmbs.filter(a => a.arrived).length}`,   "var(--green)"],
            ["TOTAL TIME SAVED",fmt(totalSaved),                               "var(--green)"],
            ["SIGNALS CLEARED", `${totalClear}`,                               "var(--amber)"],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: "var(--text-dim)" }}>{k}</span>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── AI prediction ─────────────────────────────────────────────── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(0,229,255,0.08)", borderRadius: 4, padding: "12px" }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 7, letterSpacing: 3, color: "var(--cyan-dim)", marginBottom: 7 }}>⚡ AI PREDICTION</div>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "var(--text-mid)", lineHeight: 1.6 }}>
          {allAmbs.some(a => !a.arrived)
            ? `▸ ${allAmbs.filter(a => !a.arrived).length} active corridor(s). ${totalClear} intersections pre-cleared. Efficiency: ${efficiency}/100. Est. survival improvement: +${survivalGain}%.`
            : `▸ All units arrived. Total time saved: ${fmt(totalSaved)}. Mission success.`
          }
        </div>
      </div>

    </div>
  );
}