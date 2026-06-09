import { useMemo, useRef, useState } from "react";
import Markdown from "../../lib/Markdown.jsx";
import { useProgress } from "../../state/progress.jsx";
import { BOX_INTERVALS_DAYS } from "../../lib/leitner.js";

// Step 3 — Flashcards (active recall). Each theory chunk is a card: front = question title +
// a sub-prompt (the chunk's leading bold label, if any); back = the chunk. Self-ratings feed
// one Leitner transition for the whole deck (the most conservative rating wins).
const RATINGS = [
  { key: "again", label: "Again", cls: "bg-red-500 hover:bg-red-600" },
  { key: "hard", label: "Hard", cls: "bg-amber-500 hover:bg-amber-600" },
  { key: "good", label: "Good", cls: "bg-blue-500 hover:bg-blue-600" },
  { key: "easy", label: "Easy", cls: "bg-green-500 hover:bg-green-600" },
];

function subPrompt(chunk) {
  const m = chunk.match(/^\s*(?:- )?\*\*(.+?)\*\*/);
  return m ? m[1].replace(/\s*[:.]\s*$/, "").trim() : null;
}

export default function Step3Flashcards({ question, onAdvance }) {
  const { getRecord, rateFlashcards } = useProgress();
  const cards = useMemo(() => question.theory.chunks, [question]);

  const priorBox = useRef(getRecord(question.id)?.box ?? 1);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [finished, setFinished] = useState(false);

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
  const prompt = subPrompt(card);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-stone-400">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span>Self-rate honestly — it sets your review schedule</span>
      </div>

      <div className="min-h-[220px] rounded-xl border border-stone-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Recall</div>
        <p className="mt-1 text-lg font-medium text-stone-800">{question.title}</p>
        {prompt && (
          <p className="mt-2 inline-block rounded-md bg-stone-100 px-2 py-1 text-sm text-stone-600">
            {prompt}
          </p>
        )}

        {showBack ? (
          <div className="prose prose-stone prose-sm mt-5 max-w-none border-t border-stone-100 pt-5">
            <Markdown>{card}</Markdown>
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
