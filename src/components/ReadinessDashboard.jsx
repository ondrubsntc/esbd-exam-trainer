import { useProgress } from "../state/progress.jsx";
import { boxFillClass } from "../lib/boxColor.js";

function Bar({ pct, className }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// A stacked bar across ALL questions: coloured segments by band, grey track = not started.
function SegmentedBar({ parts }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
      {parts.map((p, i) =>
        p.pct > 0 ? <div key={i} className={p.className} style={{ width: `${p.pct}%` }} title={p.title} /> : null
      )}
    </div>
  );
}

// Examiner-score bands: 1–2 red, 3 orange, 4–5 green.
function scoreBarClass(score) {
  if (score == null) return "bg-stone-200";
  if (score < 2.5) return "bg-red-500";
  if (score < 3.5) return "bg-orange-500";
  return "bg-green-500";
}

// Readiness dashboard (spec §3): per subject, % of questions in box ≥ 3 and average last
// examiner score — so the user sees where to focus.
export default function ReadinessDashboard({ questions, subjects }) {
  const { records } = useProgress();

  const stats = subjects.map((s) => {
    const qs = questions.filter((q) => q.subjectId === s.id);
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b45 = 0; // box 4–5
    let scoreSum = 0;
    let scoreN = 0;
    for (const q of qs) {
      const r = records[q.id];
      if (!r) continue;
      if (r.box >= 4) b45 += 1;
      else if (r.box === 3) b3 += 1;
      else if (r.box === 2) b2 += 1;
      else b1 += 1;
      if (r.lastExaminerScore != null) {
        scoreSum += r.lastExaminerScore;
        scoreN += 1;
      }
    }
    const started = b1 + b2 + b3 + b45;
    return {
      ...s,
      total: qs.length,
      started,
      b1,
      b2,
      b3,
      b45,
      mastered: b3 + b45,
      avgScore: scoreN ? scoreSum / scoreN : null,
    };
  });

  const overallMastered = stats.reduce((a, s) => a + s.mastered, 0);
  const overallTotal = stats.reduce((a, s) => a + s.total, 0);
  const overallPct = overallTotal ? Math.round((overallMastered / overallTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold text-stone-900">Readiness</h1>
      <p className="mt-1 text-sm text-stone-500">
        Overall {overallMastered}/{overallTotal} questions at box ≥ 3 ({overallPct}%).
      </p>
      <p className="mt-2 max-w-prose text-xs leading-relaxed text-stone-400">
        Bar colours show your <span className="font-medium text-stone-500">Leitner box</span> (memory strength,
        1–5) — not your exam score. A question's box rises when you rate its flashcards Good/Easy or score ≥ 4
        with the examiner; a score of 3 holds the box where it is, and ≤ 2 resets it to box 1.
      </p>

      <div className="mt-8 space-y-4">
        {stats.map((s) => (
          <div key={s.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-stone-800">{s.name}</h2>
              <span className="text-sm text-stone-400">
                {s.started}/{s.total} started
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-stone-500">
                  <span>Mastery across all {s.total} questions</span>
                  <span className="font-medium">{s.mastered}/{s.total} at box ≥ 3</span>
                </div>
                <SegmentedBar
                  parts={[
                    { pct: (s.b1 / s.total) * 100, className: boxFillClass(1), title: `${s.b1} at box 1` },
                    { pct: (s.b2 / s.total) * 100, className: boxFillClass(2), title: `${s.b2} at box 2` },
                    { pct: (s.b3 / s.total) * 100, className: boxFillClass(3), title: `${s.b3} at box 3` },
                    { pct: (s.b45 / s.total) * 100, className: boxFillClass(4), title: `${s.b45} at box 4–5` },
                  ]}
                />
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-500">
                  <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${boxFillClass(1)}`} />B1 {s.b1}</span>
                  <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${boxFillClass(2)}`} />B2 {s.b2}</span>
                  <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${boxFillClass(3)}`} />B3 {s.b3}</span>
                  <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${boxFillClass(4)}`} />B4–5 {s.b45}</span>
                  {s.total - s.started > 0 && <span className="text-stone-400">{s.total - s.started} not started</span>}
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-stone-500">
                  <span>Avg. last examiner score</span>
                  <span className="font-medium">
                    {s.avgScore != null ? s.avgScore.toFixed(1) : "—"}
                    <span className="font-normal text-stone-400"> / 5</span>
                  </span>
                </div>
                <Bar pct={s.avgScore != null ? (s.avgScore / 5) * 100 : 0} className={scoreBarClass(s.avgScore)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
