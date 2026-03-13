"use client";
import { useEffect, useRef } from "react";

export default function LiveLog({ logs }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:"var(--text-dim)", marginBottom:8 }}>
        SYSTEM LOG
        {logs.length > 0 && (
          <span style={{ marginLeft:8, color:"var(--cyan-dim)" }}>({logs.length})</span>
        )}
      </div>

      <div ref={ref} style={{
        background:"var(--bg-card)", border:"1px solid var(--border)",
        borderRadius:4, padding:"10px", height:145,
        overflowY:"auto", display:"flex", flexDirection:"column", gap:3,
      }}>
        {logs.length === 0 ? (
          <div style={{ display:"flex", alignItems:"center", gap:6, opacity:0.35 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--text-dim)", animation:"blink 1.5s infinite" }}/>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"var(--text-dim)" }}>
              awaiting dispatch...
            </span>
          </div>
        ) : (
          logs.map((l, i) => (
            <div key={i} style={{
              fontFamily:"'Share Tech Mono',monospace", fontSize:9, lineHeight:1.65,
              color:
                l.type === "green" ? "var(--green)" :
                l.type === "alert" ? "var(--red)" :
                l.type === "info"  ? "var(--cyan)" : "var(--text-dim)",
              animation: i === logs.length - 1 ? "slideIn 0.3s ease" : "none",
              display:"flex", alignItems:"flex-start", gap:5,
            }}>
              <span style={{ color:"var(--text-dim)", flexShrink:0, fontSize:8, marginTop:1 }}>
                {new Date().toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"})}
              </span>
              <span>{l.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}