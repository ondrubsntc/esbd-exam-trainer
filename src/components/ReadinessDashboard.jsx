import { useProgress } from "../state/progress.jsx";

function Bar({ pct, className }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Readiness dashboard (spec §3): per subject, % of questions in box ≥ 3 and average last
// examiner score — so the user sees where to focus.
export default function ReadinessDashboard({ questions, subjects }) {
  const { records } = useProgress();

  const stats = subjects.map((s) => {
    const qs = questions.filter((q) => q.subjectId === s.id);
    let started = 0;
    let mastered = 0;
    let scoreSum = 0;
    let scoreN = 0;
    for (const q of qs) {
      const r = records[q.id];
      if (!r) continue;
      started += 1;
      if (r.box >= 3) mastered += 1;
      if (r.lastExaminerScore != null) {
        scoreSum += r.lastExaminerScore;
        scoreN += 1;
      }
    }
    return {
      ...s,
      total: qs.length,
      started,
      mastered,
      masteredPct: qs.length ? Math.round((mastered / qs.length) * 100) : 0,
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
                  <span>Mastered (box ≥ 3)</span>
                  <span className="font-medium">
                    {s.mastered}/{s.total} · {s.masteredPct}%
                  </span>
                </div>
                <Bar pct={s.masteredPct} className="bg-green-500" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Avg. last examiner score</span>
                <span className="font-semibold text-stone-800">
                  {s.avgScore != null ? s.avgScore.toFixed(1) : "—"}
                  <span className="font-normal text-stone-400"> / 5</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
