import { useState } from "react";
import { callExaminer } from "../../lib/api.js";
import { useProgress } from "../../state/progress.jsx";

const scoreClasses = (s) =>
  s >= 4 ? "bg-green-100 text-green-700" : s === 3 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

// Step 4 — Connector (Theory ↔ Practice). The user writes their OWN practical example; the AI
// judges whether it demonstrates the concept (practical-fit mode), never against a stored seed.
export default function Step4Connector({ question }) {
  const { markStep } = useProgress();
  const [example, setExample] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | thinking | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function getFeedback() {
    if (!example.trim()) return;
    setPhase("thinking");
    setError("");
    try {
      const res = await callExaminer({
        mode: "practical-fit",
        question,
        messages: [{ role: "user", content: example.trim() }],
      });
      if (!res.json) throw new Error("The AI response wasn't structured — please retry.");
      setResult(res.json);
      markStep(question.id, "connect");
      setPhase("done");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  }

  const pf = result?.practicalFit;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Concept to illustrate</div>
        <p className="mt-1 font-medium text-stone-800">{question.title}</p>
        <p className="mt-3 text-sm text-stone-500">
          Write your <span className="font-medium">own</span> real-world example (one of your projects, or any
          situation) that correctly demonstrates this concept. The examiner judges it on its own merits.
        </p>
        <textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          rows={6}
          placeholder="My example…"
          className="mt-3 w-full resize-y rounded-lg border border-stone-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <button
          onClick={getFeedback}
          disabled={!example.trim() || phase === "thinking"}
          className="mt-3 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === "thinking" ? "Checking…" : "Check my example →"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={getFeedback} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {phase === "done" && result && (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          {pf && (
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Does it fit?</div>
                <div className="text-sm font-medium text-stone-700">{pf.verdict}</div>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${scoreClasses(pf.score)}`}>
                {pf.score}
              </span>
            </div>
          )}
          {pf?.note && <p className="text-sm text-stone-600">{pf.note}</p>}

          {result.strengths?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-stone-800">Strong</h4>
              <ul className="mt-1 space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600"><span className="text-stone-300">•</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.missing?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-stone-800">Missing or misapplied</h4>
              <ul className="mt-1 space-y-1">
                {result.missing.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600"><span className="text-stone-300">•</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.sharperVersion && (
            <div className="rounded-lg bg-stone-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">A sharper version to say out loud</h4>
              <p className="mt-1 text-sm italic text-stone-700">“{result.sharperVersion}”</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
