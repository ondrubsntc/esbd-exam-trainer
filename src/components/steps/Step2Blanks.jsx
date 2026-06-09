import { useState } from "react";
import { isLooseMatch } from "../../lib/fuzzy.js";
import { useProgress } from "../../state/progress.jsx";
import study from "../../data/study.json";

// Step 2 — Fill-in-the-blanks (OPTIONAL). Uses AI-generated cloze items (src/data/study.json)
// that target genuinely exam-important terms — not section labels. Loose spelling is accepted.
function matches(value, item) {
  if (isLooseMatch(value, item.answer)) return true;
  return (item.accept || []).some((a) => isLooseMatch(value, a));
}

export default function Step2Blanks({ question }) {
  const { markStep } = useProgress();
  const items = study[question.id]?.blanks ?? [];
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-stone-500">
        No blanks generated for this question yet. Skip to Flashcards.
      </div>
    );
  }

  const correctCount = items.filter((it, i) => matches(answers[i] ?? "", it)).length;

  function check() {
    setChecked(true);
    markStep(question.id, "blanks");
  }

  return (
    <div>
      <p className="mb-5 text-sm text-stone-500">
        Optional · type the missing term — loose spelling is fine, you're recalling the idea.
      </p>

      <div className="space-y-3">
        {items.map((it, i) => {
          const [before, ...rest] = it.clue.split("____");
          const after = rest.join("____");
          const value = answers[i] ?? "";
          const ok = checked && matches(value, it);
          const bad = checked && !ok;
          return (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-5 leading-8 text-stone-700">
              <span>{before}</span>
              <Blank
                value={value}
                answer={it.answer}
                ok={ok}
                bad={bad}
                disabled={checked}
                onChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))}
              />
              {after && <span>{after}</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        {checked ? (
          <span className="text-sm font-medium text-stone-600">
            {correctCount} / {items.length} correct
          </span>
        ) : (
          <span className="text-xs text-stone-400">{items.length} blanks</span>
        )}
        <div className="flex gap-2">
          {checked && (
            <button
              onClick={() => {
                setAnswers({});
                setChecked(false);
              }}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Try again
            </button>
          )}
          <button
            onClick={check}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Check answers
          </button>
        </div>
      </div>
    </div>
  );
}

function Blank({ value, answer, ok, bad, disabled, onChange }) {
  const width = Math.max(6, Math.min(answer.length + 2, 24));
  return (
    <span className="inline-flex items-baseline">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ width: `${width}ch` }}
        className={`mx-1 border-b-2 bg-transparent px-1 text-center text-stone-900 focus:outline-none ${
          ok ? "border-green-500 text-green-700" : bad ? "border-red-400 text-red-600" : "border-stone-300 focus:border-stone-600"
        }`}
        aria-label="blank"
      />
      {bad && <span className="ml-1 text-xs font-medium text-green-600">({answer})</span>}
    </span>
  );
}
