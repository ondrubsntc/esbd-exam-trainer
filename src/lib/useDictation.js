import { useEffect, useRef, useState } from "react";

// Thin wrapper around the browser Web Speech API (spec §2 Step 5). Calls `onResult(text)`
// with each finalized phrase so the caller can append it to an editable transcript.
// Web Speech misrecognises non-native English, so the transcript must stay editable.
export function useDictation(onResult) {
  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!supported) return undefined;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false; // append finalized phrases only — avoids duplicated text
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text.trim()) onResultRef.current(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, [supported]); // SR identity is stable for the page

  function start() {
    if (recRef.current && !listening) {
      try {
        recRef.current.start();
        setListening(true);
      } catch {
        /* start() throws if already started — ignore */
      }
    }
  }

  function stop() {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
    }
  }

  return { supported, listening, start, stop };
}
