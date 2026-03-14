"use client";
import { useEffect, useState, useRef } from "react";

const CAMERAS = [
  { id: "CAM-01", label: "HOSUR RD", gps: "12.9279°N 77.6271°E", fps: 25 },
  { id: "CAM-02", label: "SILK BOARD", gps: "12.9176°N 77.6233°E", fps: 30 },
  { id: "CAM-03", label: "KR MARKET", gps: "12.9767°N 77.5713°E", fps: 24 },
];

const DETECTION_CLASSES = [
  { label: "AMBULANCE", color: "#00FF88", conf: 98 },
  { label: "CAR",       color: "#FFD700", conf: 87 },
  { label: "PEDESTRIAN",color: "#00D4FF", conf: 79 },
];

function randomBetween(min, max) { return min + Math.random() * (max - min); }

export default function CameraFeed({ active = false }) {
  const [camIdx, setCamIdx]       = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [confLevel, setConfLevel] = useState(0);
  const [boxes, setBoxes]         = useState([]);
  const [frameNo, setFrameNo]     = useState(0);
  const noiseRef = useRef(null);
  const cam = CAMERAS[camIdx];

  // Reset when camera switches or inactive
  useEffect(() => {
    setDetecting(false);
    setTriggered(false);
    setConfLevel(0);
    setBoxes([]);
    if (!active) return;

    const t1 = setTimeout(() => {
      setDetecting(true);
      setBoxes([
        { cls: 0, x: 28, y: 38, w: 48, h: 34 },
        { cls: 1, x: 68, y: 50, w: 22, h: 16 },
        { cls: 2, x: 12, y: 55, w: 10, h: 22 },
      ]);
    }, 1800 + camIdx * 300);

    return () => clearTimeout(t1);
  }, [active, camIdx]);

  // Confidence fill animation
  useEffect(() => {
    if (!detecting) { setConfLevel(0); return; }
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(v + randomBetween(1.2, 3.5), 100);
      setConfLevel(Math.round(v));
      if (v >= 100) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [detecting]);

  // Box jitter animation
  useEffect(() => {
    if (!detecting) return;
    const id = setInterval(() => {
      setBoxes(prev => prev.map(b => ({
        ...b,
        x: Math.max(5, Math.min(82, b.x + (Math.random() - 0.5) * 1.2)),
        y: Math.max(10, Math.min(65, b.y + (Math.random() - 0.5) * 0.8)),
      })));
      setFrameNo(n => n + 1);
    }, 120);
    return () => clearInterval(id);
  }, [detecting]);

  const triggerGreenWave = () => {
    setTriggered(true);
    setTimeout(() => setTriggered(false), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

      {/* Camera Tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {CAMERAS.map((c, i) => (
          <button key={c.id} onClick={() => setCamIdx(i)} style={{
            flex: 1, padding: "4px 0", fontSize: 8,
            fontFamily: "'Share Tech Mono',monospace", letterSpacing: 1,
            background: i === camIdx ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${i === camIdx ? "#00FF88" : "#0e2035"}`,
            color: i === camIdx ? "#00FF88" : "#6a9ab8",
            borderRadius: 3, cursor: "pointer", transition: "all 0.2s",
          }}>
            {c.id}
          </button>
        ))}
      </div>

      {/* Main Feed */}
      <div style={{
        background: "#050a10",
        border: `1px solid ${detecting ? "rgba(0,255,136,0.4)" : "#0e2035"}`,
        borderRadius: 4, padding: 0, position: "relative",
        height: 220, overflow: "hidden",  // Increased height for more prominence
        transition: "border-color 0.3s",
      }}>
        {/* Scanlines overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
          background: "repeating-linear-gradient(0deg,rgba(0,0,0,0.12) 0px,rgba(0,0,0,0.12) 1px,transparent 1px,transparent 3px)",
        }} />

        {/* Noise grain */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9,
          opacity: 0.04,
          background: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }} />

        {/* Top Metadata */}
        <div style={{
          position: "absolute", top: 5, left: 8, zIndex: 20,
          fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: "#ffffff",
          textShadow: "0 1px 3px #000",
        }}>
          {cam.id} · {cam.label}
          <span style={{ marginLeft: 8, color: "#6a9ab8", fontSize: 7 }}>{cam.gps}</span>
        </div>
        <div style={{
          position: "absolute", top: 5, right: 8, zIndex: 20,
          fontFamily: "'Share Tech Mono',monospace", fontSize: 8,
          color: "#FF2244", textShadow: "0 1px 3px #000",
          animation: "blink 1.5s infinite",
        }}>● REC</div>

        {/* Frame Counter */}
        <div style={{
          position: "absolute", bottom: 5, right: 8, zIndex: 20,
          fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: "#6a9ab8",
        }}>
          FPS:{cam.fps} · YOLOv8-nano · #F{String(frameNo).padStart(5, "0")}
        </div>

        {/* Model info bottom-left */}
        <div style={{
          position: "absolute", bottom: 5, left: 8, zIndex: 20,
          fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: "#2a4a62",
        }}>GW-VISION v2.1</div>

        {!active ? (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5,
            fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)",
          }}>FEED IDLE — AWAITING DISPATCH</div>
        ) : (
          <>
            {/* Simulated road scene */}
            <div style={{ position: "absolute", bottom: 0, width: "100%", height: "45%", background: "linear-gradient(180deg,#0d1a28 0%,#0a1420 100%)" }} />
            <div style={{ position: "absolute", top: "30%", left: "42%", width: "18%", height: "100%", background: "linear-gradient(180deg,#081018 0%,#0a1420 100%)", transform: "perspective(120px) rotateX(45deg)" }} />
            {/* Lane lines */}
            {[20, 35, 50, 65, 80].map(p => (
              <div key={p} style={{ position: "absolute", bottom: "8%", left: `${p}%`, width: 14, height: 3, background: "rgba(255,255,200,0.3)", borderRadius: 1 }} />
            ))}

            {/* Detection Boxes */}
            {detecting && boxes.map((b, bi) => {
              const cls = DETECTION_CLASSES[b.cls];
              return (
                <div key={bi} style={{
                  position: "absolute", left: `${b.x}%`, top: `${b.y}%`,
                  width: `${b.w}%`, height: `${b.h}%`,
                  border: `1.5px solid ${cls.color}`,
                  animation: bi === 0 ? "detection-ring 1.2s infinite" : "none",
                  transition: "left 0.12s linear, top 0.12s linear",
                  zIndex: 15,
                }}>
                  {/* Corner brackets */}
                  {[["top:-2px","left:-2px","borderTop","borderLeft"],
                    ["top:-2px","right:-2px","borderTop","borderRight"],
                    ["bottom:-2px","left:-2px","borderBottom","borderLeft"],
                    ["bottom:-2px","right:-2px","borderBottom","borderRight"]].map(([t,s,b1,b2], ci) => (
                    <div key={ci} style={{
                      position:"absolute",[t.split(":")[0]]:t.split(":")[1],[s.split(":")[0]]:s.split(":")[1],
                      width:6, height:6,
                      [b1]:`2px solid #fff`, [b2]:`2px solid #fff`,
                    }} />
                  ))}
                  {/* Label */}
                  <div style={{
                    position: "absolute", top: -14, left: -2,
                    background: cls.color, color: "#000",
                    fontFamily: "monospace", fontSize: 7, padding: "1px 4px",
                    whiteSpace: "nowrap", fontWeight: 700, letterSpacing: 0.5,
                  }}>
                    {cls.label} {cls.conf - (bi * 3)}%
                  </div>
                </div>
              );
            })}

            {/* Alert banner */}
            {detecting && (
              <div style={{
                position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
                background: "rgba(229,25,30,0.92)", border: "1px solid rgba(255,80,80,0.6)",
                color: "#fff", fontFamily: "'Share Tech Mono',monospace", fontSize: 8,
                padding: "3px 10px", borderRadius: 2, whiteSpace: "nowrap", zIndex: 18,
                animation: "fadeIn 0.3s ease",
              }}>
                🚨 CRITICAL VEHICLE — TRIGGERING GREENWAVE
              </div>
            )}
          </>
        )}
      </div>

      {/* Confidence Meter */}
      {active && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: "#6a9ab8", whiteSpace: "nowrap" }}>
            DETECT CONF
          </span>
          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, transition: "width 0.08s linear",
              width: `${confLevel}%`,
              background: confLevel > 80 ? "linear-gradient(90deg,#005533,#00FF88)" : confLevel > 40 ? "linear-gradient(90deg,#7a4010,#FFD700)" : "#FF2244",
              boxShadow: confLevel > 80 ? "0 0 6px #00FF88" : "none",
            }} />
          </div>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: confLevel > 80 ? "#00FF88" : "#FFD700", minWidth: 26 }}>
            {confLevel}%
          </span>
        </div>
      )}

      {/* Multi-class Legend */}
      {active && detecting && (
        <div style={{ display: "flex", gap: 8 }}>
          {DETECTION_CLASSES.map(cls => (
            <div key={cls.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 6, height: 6, background: cls.color, borderRadius: 1 }} />
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: "#6a9ab8" }}>{cls.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Trigger Green Wave Button */}
      {active && detecting && (
        <button onClick={triggerGreenWave} style={{
          width: "100%", padding: "6px 0",
          background: triggered ? "rgba(0,255,136,0.25)" : "rgba(0,255,136,0.08)",
          border: `1px solid ${triggered ? "#00FF88" : "rgba(0,255,136,0.3)"}`,
          color: triggered ? "#00FF88" : "#6a9ab8",
          fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 2,
          borderRadius: 3, cursor: "pointer",
          animation: triggered ? "trigger-flash 0.4s ease" : "none",
          transition: "all 0.2s",
        }}>
          {triggered ? "✓ GREENWAVE TRIGGERED" : "⚡ TRIGGER GREEN WAVE"}
        </button>
      )}
    </div>
  );
}
