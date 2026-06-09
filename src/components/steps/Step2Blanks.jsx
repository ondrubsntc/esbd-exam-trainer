import { useMemo, useState } from "react";
import { isLooseMatch } from "../../lib/fuzzy.js";
import { useProgress } from "../../state/progress.jsx";

// Step 2 — Fill-in-the-blanks (OPTIONAL, off by default at the workflow level). Blanks out
// short, term-like key terms in the theory; loose spelling is accepted (recall the concept).
// Pick concise terms only — long bold "labels" make poor blanks.
function blankableTerms(keyTerms) {
  const seen = new Set();
  const out = [];
  for (const raw of keyTerms) {
    const t = raw.trim();
    const key = t.toLowerCase();
    const words = t.split(/\s+/);
    if (seen.has(key)) continue;
    if (words.length <= 3 && t.length >= 2 && t.length <= 26 && /[A-Za-z]/.test(t)) {
      seen.add(key);
      out.push(t);
    }
    if (out.length >= 12) break; // keep it lightweight
  }
  return out;
}

// Turn the theory chunks into a render model, blanking each term once (first occurrence).
function buildModel(chunks, terms) {
  const used = new Set();
  const blanks = [];
  const blocks = chunks.map((chunk) => {
    const stripped = chunk.replace(/\*\*/g, "").replace(/\*/g, "");
    return stripped.split("\n").map((rawLine) => {
      const line = rawLine.replace(/^- /, "• ");
      const segments = [];
      let rest = line;
      let guard = 0;
      while (guard++ < 50) {
        let best = null;
        for (const term of terms) {
          if (used.has(term.toLowerCase())) continue;
          const idx = rest.toLowerCase().indexOf(term.toLowerCase());
          if (idx >= 0 && (best === null || idx < best.idx)) best = { idx, term };
        }
        if (!best) break;
        const answer = rest.slice(best.idx, best.idx + best.term.length); // preserve original case
        if (best.idx > 0) segments.push({ type: "text", value: rest.slice(0, best.idx) });
        const id = `b${blanks.length}`;
        blanks.push({ id, answer });
        segments.push({ type: "blank", id, answer });
        used.add(best.term.toLowerCase());
        rest = rest.slice(best.idx + best.term.length);
      }
      if (rest) segments.push({ type: "text", value: rest });
      return segments;
    });
  });
  return { blocks, blanks };
}

export default function Step2Blanks({ question }) {
  const { markStep } = useProgress();
  const model = useMemo(
    () => buildModel(question.theory.chunks, blankableTerms(question.theory.keyTerms)),
    [question]
  );
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  if (model.blanks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-stone-500">
        This question has no short key terms to blank out. Skip to Flashcards.
      </div>
    );
  }

  const correctCount = model.blanks.filter((b) => isLooseMatch(answers[b.id] ?? "", b.answer)).length;

  function check() {
    setChecked(true);
    markStep(question.id, "blanks");
  }

  return (
    <div>
      <p className="mb-5 text-sm text-stone-500">
        Optional · type the missing key terms — loose spelling is fine, you're recalling the idea.
      </p>

      <div className="space-y-4">
        {model.blocks.map((lines, bi) => (
          <div key={bi} className="rounded-xl border border-stone-200 bg-white p-5 leading-7 text-stone-700">
            {lines.map((segs, li) => (
              <p key={li} className={li > 0 ? "mt-1" : ""}>
                {segs.map((seg, si) =>
                  seg.type === "text" ? (
                    <span key={si}>{seg.value}</span>
                  ) : (
                    <Blank
                      key={si}
                      value={answers[seg.id] ?? ""}
                      answer={seg.answer}
                      checked={checked}
                      onChange={(v) => setAnswers((a) => ({ ...a, [seg.id]: v }))}
                    />
                  )
                )}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        {checked ? (
          <span className="text-sm font-medium text-stone-600">
            {correctCount} / {model.blanks.length} correct
          </span>
        ) : (
          <span className="text-xs text-stone-400">{model.blanks.length} blanks</span>
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

function Blank({ value, answer, checked, onChange }) {
  const ok = checked && isLooseMatch(value, answer);
  const bad = checked && !ok;
  const width = Math.max(6, Math.min(answer.length + 2, 22));
  return (
    <span className="inline-flex items-baseline">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={checked}
        style={{ width: `${width}ch` }}
        className={`mx-0.5 border-b-2 bg-transparent px-1 text-center text-stone-900 focus:outline-none ${
          ok ? "border-green-500 text-green-700" : bad ? "border-red-400 text-red-600" : "border-stone-300 focus:border-stone-600"
        }`}
        aria-label="blank"
      />
      {bad && <span className="ml-1 text-xs font-medium text-green-600">({answer})</span>}
    </span>
  );
}
