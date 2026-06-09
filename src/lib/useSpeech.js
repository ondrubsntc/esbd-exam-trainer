import { useEffect, useMemo, useState } from "react";

// Text-to-speech over the browser's free, offline SpeechSynthesis API. The default picker used to
// grab the first en voice, which on macOS is often a robotic "novelty" voice (Fred/Zarvox/…) —
// hence the "drunk horror" sound. We now exclude novelty voices, rank for natural ones, and let
// the user choose (remembered in localStorage).
const PREFERRED = [
  /google/i, /natural/i, /online/i, /premium/i, /enhanced/i, /neural/i, /siri/i,
  /samantha/i, /\bava\b/i, /allison/i, /\baria\b/i, /jenny/i, /\bguy\b/i, /\bzoe\b/i,
  /\btom\b/i, /evan/i, /joanna/i, /serena/i, /matilda/i, /nicky/i, /aaron/i,
];
const NOVELTY = [
  /fred/i, /albert/i, /bad news/i, /good news/i, /bahh/i, /bells/i, /boing/i, /bubbles/i,
  /cellos/i, /deranged/i, /hysterical/i, /jester/i, /organ/i, /trinoids/i, /whisper/i,
  /wobble/i, /zarvox/i, /junior/i, /ralph/i, /kathy/i, /princess/i, /superstar/i,
  /grandma/i, /grandpa/i, /rocko/i, /shelley/i, /sandy/i, /\bflo\b/i, /eddy/i, /\breed\b/i,
  /rishi/i, /novelty/i,
];

const isNovelty = (name) => NOVELTY.some((re) => re.test(name));
function score(v) {
  let s = 0;
  if (!v.localService) s += 2; // network voices are usually higher quality
  if (PREFERRED.some((re) => re.test(v.name))) s += 3;
  if (/^en[-_]US/i.test(v.lang)) s += 1;
  return s;
}

const STORAGE_KEY = "esbd.ttsVoiceURI";

export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState([]);
  const [chosenURI, setChosenURI] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    const load = () => {
      const en = synth
        .getVoices()
        .filter((v) => v.lang && v.lang.toLowerCase().startsWith("en") && !isNovelty(v.name))
        .sort((a, b) => score(b) - score(a));
      setVoices(en);
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      synth.cancel();
    };
  }, [supported]);

  // The active voice: the user's saved pick if still available, else the best-ranked natural one.
  const voice = useMemo(() => {
    if (!voices.length) return null;
    return voices.find((v) => v.voiceURI === chosenURI) || voices[0];
  }, [voices, chosenURI]);

  function setVoiceURI(uri) {
    setChosenURI(uri);
    try {
      localStorage.setItem(STORAGE_KEY, uri);
    } catch {
      /* ignore */
    }
  }

  function speak(text) {
    if (!supported || !text) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const pieces = text.match(/[^.!?]+[.!?]*/g) || [text];
    pieces.forEach((piece, i) => {
      const trimmed = piece.trim();
      if (!trimmed) return;
      const u = new SpeechSynthesisUtterance(trimmed);
      u.lang = (voice && voice.lang) || "en-US";
      u.rate = 1.0;
      u.pitch = 1.0;
      if (voice) u.voice = voice;
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

  return { supported, speaking, voices, voiceURI: voice?.voiceURI ?? "", setVoiceURI, speak, stop };
}
