import { useEffect, useState } from "react";
import Step5Examiner from "./steps/Step5Examiner.jsx";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Commission mode (spec §3): pick a subject (or all), draw a RANDOM question, optionally run a
// prep timer, then go straight to the oral examiner. Trains real exam conditions.
export default function CommissionMode({ questions, subjects }) {
  const [subjectId, setSubjectId] = useState("all");
  const [usePrep, setUsePrep] = useState(true);
  const [prepSeconds, setPrepSeconds] = useState(120);
  const [phase, setPhase] = useState("setup"); // setup | prep | answer
  const [current, setCurrent] = useState(null);
  const [round, setRound] = useState(0);
  const [remaining, setRemaining] = useState(0);

  // Prep-timer duration is configurable via PREP_TIMER_SECONDS on the backend.
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => d.prepTimerSeconds && setPrepSeconds(d.prepTimerSeconds))
      .catch(() => {});
  }, []);

  // Countdown during prep.
  useEffect(() => {
    if (phase !== "prep") return undefined;
    if (remaining <= 0) {
      setPhase("answer");
      return undefined;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, remaining]);

  const pool = subjectId === "all" ? questions : questions.filter((q) => q.subjectId === subjectId);

  function draw() {
    const q = pool[Math.floor(Math.random() * pool.length)];
    setCurrent(q);
    setRound((r) => r + 1);
    if (usePrep) {
      setRemaining(prepSeconds);
      setPhase("prep");
    } else {
      setPhase("answer");
    }
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <h1 className="text-2xl font-semibold text-stone-900">Commission mode</h1>
        <p className="mt-1 text-sm text-stone-500">
          A random question is drawn, like standing in front of the real commission. Optionally prepare for a
          set time, then deliver your spoken answer to the examiner.
        </p>

        <div className="mt-8 space-y-5 rounded-xl border border-stone-200 bg-white p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Subject pool</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            >
              <option value="all">All subjects ({questions.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.questionCount})
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-stone-700">
              Prep timer
              <span className="ml-2 font-normal text-stone-400">{usePrep ? fmt(prepSeconds) : "off"}</span>
            </span>
            <input
              type="checkbox"
              checked={usePrep}
              onChange={(e) => setUsePrep(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
          </label>

          <button
            onClick={draw}
            className="w-full rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Draw a question →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "prep" && current) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Prepare your answer</div>
        <div className="mt-2 text-xs text-stone-400">
          {current.subject} · Q{current.number}
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">{current.title}</h1>
        {current.examArea && <p className="mt-3 text-sm italic text-stone-500">{current.examArea}</p>}

        <div className="mt-8 text-5xl font-bold tabular-nums text-stone-800">{fmt(remaining)}</div>

        <button
          onClick={() => setPhase("answer")}
          className="mt-8 rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          Start answering now →
        </button>
      </div>
    );
  }

  // phase === "answer"
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Commission · {current.subject} · Q{current.number}
        </span>
        <button onClick={() => setPhase("setup")} className="text-xs font-medium text-stone-400 hover:text-stone-600">
          ← Change subject
        </button>
      </div>
      <h1 className="mb-6 text-2xl font-semibold leading-tight text-stone-900">{current.title}</h1>

      <Step5Examiner key={`${current.id}:${round}`} question={current} />

      <button
        onClick={draw}
        className="mt-6 w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
      >
        Draw next question →
      </button>
    </div>
  );
}
