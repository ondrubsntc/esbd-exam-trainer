import { useEffect, useRef, useState } from "react";

// Text-to-speech over the browser's free, offline SpeechSynthesis API (mirrors useDictation.js).
// Long text is split into sentence-sized utterances and queued — this avoids the Chrome bug that
// cuts off utterances longer than ~15s, and gives natural pauses for reading along.
export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    const pickVoice = () => {
      const voices = synth.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang === "en-US") ||
        voices.find((v) => v.lang && v.lang.startsWith("en")) ||
        null;
    };
    pickVoice();
    synth.addEventListener?.("voiceschanged", pickVoice);
    return () => {
      synth.removeEventListener?.("voiceschanged", pickVoice);
      synth.cancel(); // stop audio when the component unmounts
    };
  }, [supported]);

  function speak(text) {
    if (!supported || !text) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const pieces = text.match(/[^.!?]+[.!?]*/g) || [text];
    pieces.forEach((piece, i) => {
      const trimmed = piece.trim();
      if (!trimmed) return;
      const u = new SpeechSynthesisUtterance(trimmed);
      u.lang = "en-US";
      u.rate = 0.95;
      if (voiceRef.current) u.voice = voiceRef.current;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === pieces.length - 1) u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    });
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return { supported, speaking, speak, stop };
}
