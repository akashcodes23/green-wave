"use client";

export default function VoiceAlert({ speaking, enabled, onToggle, lastAlert, apiKey, onKeyChange }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:"var(--text-dim)" }}>
        ▸ VOICE ALERTS
      </div>

      {/* Waveform + status */}
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        background:"var(--bg-card)",
        border:`1px solid ${speaking ? "rgba(0,229,255,0.4)" : "var(--border)"}`,
        borderRadius:4, padding:"8px 12px",
        boxShadow: speaking ? "0 0 20px rgba(0,229,255,0.08)" : "none",
        transition:"all 0.3s",
      }}>
        {/* Animated waveform */}
        <div style={{ display:"flex", alignItems:"center", gap:2, height:16, flexShrink:0 }}>
          {[0.3,0.7,1,0.8,0.5,0.9,0.6,0.4,0.8,0.3].map((h, i) => (
            <div key={i} style={{
              width:2, borderRadius:1,
              background: enabled ? "var(--cyan)" : "var(--text-dim)",
              height: speaking ? `${h * 16}px` : "3px",
              transition:"height 0.15s",
              animation: speaking ? `voice-wave ${0.4 + i * 0.05}s ease-in-out infinite alternate` : "none",
              animationDelay:`${i * 0.06}s`,
            }}/>
          ))}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, letterSpacing:2, color:"var(--text-dim)", marginBottom:2 }}>
            {enabled ? (speaking ? "BROADCASTING" : "ACTIVE — STANDBY") : "VOICE MUTED"}
          </div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:speaking?"var(--cyan)":"var(--text-mid)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {speaking ? `▶ ${lastAlert}` : lastAlert || "— no recent alert —"}
          </div>
        </div>

        <button onClick={onToggle} style={{
          background: enabled ? "rgba(0,229,255,0.08)" : "transparent",
          border:`1px solid ${enabled ? "var(--cyan)" : "var(--border-hi)"}`,
          borderRadius:3, padding:"4px 8px", cursor:"pointer",
          fontFamily:"'Share Tech Mono',monospace", fontSize:8,
          color: enabled ? "var(--cyan)" : "var(--text-dim)",
          letterSpacing:1, transition:"all 0.2s", flexShrink:0,
        }}>
          {enabled ? "🔊" : "🔇"}
        </button>
      </div>

      {/* ElevenLabs key */}
      <div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, letterSpacing:2, color:"var(--text-dim)", marginBottom:5 }}>
          ELEVENLABS KEY <span style={{ color:"var(--text-dim)", opacity:0.5 }}>(optional — browser TTS if empty)</span>
        </div>
        <input
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={e => onKeyChange(e.target.value)}
          style={{
            width:"100%", background:"var(--bg-card)",
            border:"1px solid var(--border-hi)", borderRadius:3,
            padding:"7px 10px", fontFamily:"'Share Tech Mono',monospace",
            fontSize:9, color:"var(--cyan)", outline:"none", letterSpacing:1,
          }}
        />
      </div>
    </div>
  );
}