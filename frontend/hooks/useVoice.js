"use client";
import { useCallback, useRef, useState } from "react";

// ElevenLabs free tier — Rachel voice (calm, clear, authoritative)
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const ELEVENLABS_MODEL    = "eleven_monolingual_v1";

// Voice messages for different events
export const VOICE_SCRIPTS = {
  dispatch:       (route) => `Emergency dispatch activated. Green corridor initiated on ${route}. All signals coordinating. Estimated arrival in under 8 minutes.`,
  signal_clear:   (name)  => `${name} cleared.`,
  halfway:                   "Ambulance at halfway point. Maintaining corridor integrity.",
  arrival:        (dest)  => `Ambulance has arrived at ${dest}. Patient handover initiated. All corridors restored.`,
  congestion:                "High congestion detected. Rerouting corridor for optimal path.",
};

export function useVoice(apiKey) {
  const [speaking,  setSpeaking]  = useState(false);
  const [enabled,   setEnabled]   = useState(true);
  const audioRef  = useRef(null);
  const queueRef  = useRef([]);
  const playingRef= useRef(false);

  const speak = useCallback(async (text) => {
    if (!enabled || !apiKey || apiKey === "your_elevenlabs_key_here") {
      // Fallback to browser TTS if no API key
      if (!enabled) return;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate   = 0.95;
        utt.pitch  = 0.9;
        utt.volume = 0.8;
        // Pick a deep voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
          v.name.includes("Google UK English Female") ||
          v.name.includes("Samantha") ||
          v.name.includes("Victoria")
        );
        if (preferred) utt.voice = preferred;
        window.speechSynthesis.speak(utt);
      }
      return;
    }

    // Queue the text
    queueRef.current.push(text);
    if (!playingRef.current) processQueue(apiKey);
  }, [enabled, apiKey]);

  async function processQueue(key) {
    if (queueRef.current.length === 0) { playingRef.current = false; return; }
    playingRef.current = true;
    const text = queueRef.current.shift();

    try {
      setSpeaking(true);
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
        {
          method:  "POST",
          headers: {
            "xi-api-key":   key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_MODEL,
            voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2 },
          }),
        }
      );

      if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
        processQueue(key);
      };
      audio.onerror = () => {
        setSpeaking(false);
        processQueue(key);
      };

      await audio.play();
    } catch (err) {
      console.warn("ElevenLabs TTS failed, using browser fallback:", err);
      setSpeaking(false);
      // Fallback to browser TTS
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.95;
        window.speechSynthesis.speak(utt);
      }
      processQueue(key);
    }
  }

  const stop = useCallback(() => {
    audioRef.current?.pause();
    queueRef.current = [];
    setSpeaking(false);
    playingRef.current = false;
    window.speechSynthesis?.cancel();
  }, []);

  const toggle = useCallback(() => setEnabled(e => !e), []);

  return { speak, stop, speaking, enabled, toggle };
}