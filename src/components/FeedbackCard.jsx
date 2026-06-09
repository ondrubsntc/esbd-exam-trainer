// Renders the examiner's final feedback JSON (spec §5.1). Leads with the overall score and
// the concrete fixes, keeps everything scannable.
function scoreClasses(score) {
  if (score >= 4) return "bg-green-100 text-green-700";
  if (score === 3) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function Score({ value }) {
  return (
    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold ${scoreClasses(value)}`}>
      {value}
    </span>
  );
}

function List({ items, className = "" }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className={`mt-1 space-y-1 ${className}`}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-stone-600">
          <span className="text-stone-300">•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function FeedbackCard({ feedback, boxInfo }) {
  const { theoryCoverage, practicalFit, clarity, overall, strengths, fixes, modelMiniAnswer } = feedback;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      {/* Header: overall score */}
      <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Examiner verdict</div>
          <div className="text-sm text-stone-500">Overall score</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${scoreClasses(overall)}`}>
          {overall}
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        {/* Fixes first — the most actionable part */}
        {fixes && fixes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-stone-800">Fix these to sound stronger</h4>
            <List items={fixes} />
          </div>
        )}

        {strengths && strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-stone-800">What was strong</h4>
            <List items={strengths} />
          </div>
        )}

        {/* Sub-scores */}
        <div className="grid gap-3 sm:grid-cols-3">
          {theoryCoverage && (
            <div className="rounded-lg border border-stone-100 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Theory</span>
                <Score value={theoryCoverage.score} />
              </div>
              {theoryCoverage.missing && theoryCoverage.missing.length > 0 && (
                <p className="mt-2 text-xs text-stone-500">
                  <span className="font-medium text-stone-600">Missing: </span>
                  {theoryCoverage.missing.join(", ")}
                </p>
              )}
            </div>
          )}
          {practicalFit && (
            <div className="rounded-lg border border-stone-100 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Practical</span>
                <Score value={practicalFit.score} />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                <span className="font-medium text-stone-600">{practicalFit.verdict}</span>
                {practicalFit.note ? ` — ${practicalFit.note}` : ""}
              </p>
            </div>
          )}
          {clarity && (
            <div className="rounded-lg border border-stone-100 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Clarity</span>
                <Score value={clarity.score} />
              </div>
              {clarity.note && <p className="mt-2 text-xs text-stone-500">{clarity.note}</p>}
            </div>
          )}
        </div>

        {modelMiniAnswer && (
          <div className="rounded-lg bg-stone-50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">A strong spoken answer sounds like</h4>
            <p className="mt-1 text-sm italic text-stone-700">“{modelMiniAnswer}”</p>
          </div>
        )}

        {boxInfo && (
          <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
            Leitner box <span className="font-semibold">{boxInfo.prior} → {boxInfo.next}</span> · next review in{" "}
            {boxInfo.days} day{boxInfo.days === 1 ? "" : "s"} ({boxInfo.dueText})
          </div>
        )}
      </div>
    </div>
  );
}
