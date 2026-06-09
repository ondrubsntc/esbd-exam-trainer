import { useEffect, useState } from "react";
import Markdown from "../../lib/Markdown.jsx";
import { useProgress } from "../../state/progress.jsx";
import { useSpeech } from "../../lib/useSpeech.js";

// Turn the revealed chunks into clean text for the speech engine (drop markdown markers).
function stripForSpeech(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[-•]\s*/gm, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSpeakable(shown) {
  const parts = [];
  let lastSection = null;
  for (const it of shown) {
    if (it.section !== lastSection) {
      parts.push(it.section === "THEORY" ? "Theory." : "Practical application.");
      lastSection = it.section;
    }
    parts.push(stripForSpeech(it.text));
  }
  return parts.join(" ");
}

// Step 1 — Deconstruction (chunked reading). Reveals theory then practical one chunk at a
// time. Optional "Attempt first": brain-dump what you know before revealing (generation effect).
// Optional "Read aloud": the browser reads the revealed text in English so you read along.
export default function Step1Read({ question }) {
  const items = [
    ...question.theory.chunks.map((text) => ({ section: "THEORY", text })),
    ...question.practical.chunks.map((text) => ({ section: "PRACTICAL APPLICATION", text })),
  ];

  const [attemptFirst, setAttemptFirst] = useState(false);
  const [started, setStarted] = useState(false);
  const [brainDump, setBrainDump] = useState("");
  const [revealed, setRevealed] = useState(1); // first chunk is shown immediately

  const inAttemptGate = attemptFirst && !started;
  const shown = inAttemptGate ? [] : items.slice(0, revealed);
  const remaining = items.length - revealed;

  const { markStep } = useProgress();
  const { supported: ttsSupported, speaking, speak, stop, voices, voiceURI, setVoiceURI } = useSpeech();

  const done = !inAttemptGate && remaining === 0;
  useEffect(() => {
    if (done) markStep(question.id, "read");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, question.id]);

  function resetReveal(nextAttemptFirst) {
    setAttemptFirst(nextAttemptFirst);
    setStarted(false);
    setRevealed(1);
    stop();
  }

  return (
    <div>
      <label className="mb-5 flex cursor-pointer select-none items-center gap-2 text-sm text-stone-600">
        <input
          type="checkbox"
          checked={attemptFirst}
          onChange={(e) => resetReveal(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300"
        />
        Attempt first — brain-dump what I already know before revealing
      </label>

      {inAttemptGate ? (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <p className="mb-3 text-sm text-stone-500">
            Write everything you can recall about this question, then reveal the material.
          </p>
          <textarea
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            rows={6}
            placeholder="Type your brain-dump…"
            className="w-full resize-y rounded-lg border border-stone-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
          <button
            onClick={() => setStarted(true)}
            className="mt-4 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Reveal material →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((item, i) => {
            const newSection = i === 0 || shown[i - 1].section !== item.section;
            return (
              <div key={i}>
                {newSection && (
                  <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-stone-400 first:mt-0">
                    {item.section}
                  </div>
                )}
                <div className="prose prose-stone prose-sm max-w-none rounded-xl border border-stone-200 bg-white p-5">
                  <Markdown>{item.text}</Markdown>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              {ttsSupported && (
                <>
                  <button
                    onClick={() => (speaking ? stop() : speak(toSpeakable(shown)))}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      speaking
                        ? "bg-stone-800 text-white hover:bg-stone-700"
                        : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
                    }`}
                    title="Read the revealed text aloud (English)"
                  >
                    {speaking ? "⏹ Stop" : "🔊 Read aloud"}
                  </button>
                  {voices.length > 1 && (
                    <select
                      value={voiceURI}
                      onChange={(e) => setVoiceURI(e.target.value)}
                      title="Choose a voice"
                      className="max-w-[11rem] rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    >
                      {voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
              <span className="text-xs text-stone-400">
                Showing {revealed} of {items.length}
              </span>
            </div>
            {remaining > 0 ? (
              <button
                onClick={() => setRevealed((r) => Math.min(items.length, r + 1))}
                className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                Next →
              </button>
            ) : (
              <span className="rounded-lg border border-green-100 bg-green-50 px-4 py-2 text-sm text-green-800">
                ✓ Whole answer read
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
