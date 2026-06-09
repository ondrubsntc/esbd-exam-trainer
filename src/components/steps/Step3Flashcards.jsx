import { useMemo, useRef, useState } from "react";
import Markdown from "../../lib/Markdown.jsx";
import { useProgress } from "../../state/progress.jsx";
import { BOX_INTERVALS_DAYS } from "../../lib/leitner.js";
import study from "../../data/study.json";

// Step 3 — Flashcards (active recall). Cards are AI-generated Q→A pairs (src/data/study.json):
// front = a SPECIFIC recall prompt, back = a complete answer. Self-ratings feed one Leitner
// transition for the whole deck (the most conservative rating wins).
const RATINGS = [
  { key: "again", label: "Again", cls: "bg-red-500 hover:bg-red-600" },
  { key: "hard", label: "Hard", cls: "bg-amber-500 hover:bg-amber-600" },
  { key: "good", label: "Good", cls: "bg-blue-500 hover:bg-blue-600" },
  { key: "easy", label: "Easy", cls: "bg-green-500 hover:bg-green-600" },
];

export default function Step3Flashcards({ question, onAdvance }) {
  const { getRecord, rateFlashcards } = useProgress();
  const cards = useMemo(() => study[question.id]?.flashcards ?? [], [question]);

  const priorBox = useRef(getRecord(question.id)?.box ?? 1);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [finished, setFinished] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-stone-500">
        No flashcards generated for this question yet.
      </div>
    );
  }

  function rate(ratingKey) {
    const next = [...ratings, ratingKey];
    if (index + 1 >= cards.length) {
      rateFlashcards(question.id, next); // one Leitner update for the session
      setRatings(next);
      setFinished(true);
    } else {
      setRatings(next);
      setIndex(index + 1);
      setShowBack(false);
    }
  }

  function restart() {
    priorBox.current = getRecord(question.id)?.box ?? 1;
    setIndex(0);
    setShowBack(false);
    setRatings([]);
    setFinished(false);
  }

  if (finished) {
    const record = getRecord(question.id);
    const newBox = record?.box ?? priorBox.current;
    const days = BOX_INTERVALS_DAYS[newBox];
    const dueText = record?.due ? new Date(record.due).toLocaleDateString() : "—";
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
        <div className="text-3xl">✓</div>
        <h3 className="mt-2 text-lg font-semibold text-stone-800">Deck complete</h3>
        <p className="mt-2 text-sm text-stone-600">
          Leitner box{" "}
          <span className="font-semibold">
            {priorBox.current} → {newBox}
          </span>{" "}
          · next review in {days} day{days === 1 ? "" : "s"} ({dueText})
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={restart}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Run deck again
          </button>
          {onAdvance && (
            <button
              onClick={onAdvance}
              className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Continue to Connector →
            </button>
          )}
        </div>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-stone-400">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span>Self-rate honestly — it sets your review schedule</span>
      </div>

      <div className="min-h-[220px] rounded-xl border border-stone-200 bg-white p-6">
        {/* question title is muted context; the card front is the specific recall prompt */}
        <div className="text-[11px] font-medium uppercase tracking-wide text-stone-300">{question.title}</div>
        <p className="mt-2 text-lg font-medium text-stone-800">{card.front}</p>

        {showBack ? (
          <div className="prose prose-stone prose-sm mt-5 max-w-none border-t border-stone-100 pt-5">
            <Markdown>{card.back}</Markdown>
          </div>
        ) : (
          <p className="mt-5 text-sm text-stone-400">Say or think your answer, then reveal.</p>
        )}
      </div>

      {showBack ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.key}
              onClick={() => rate(r.key)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium text-white transition ${r.cls}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setShowBack(true)}
          className="mt-4 w-full rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          Show answer
        </button>
      )}
    </div>
  );
}
