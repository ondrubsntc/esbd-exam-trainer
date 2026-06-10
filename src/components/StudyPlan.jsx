import { useMemo, useState } from "react";
import { useProgress } from "../state/progress.jsx";
import { buildPlan, daysUntil, stepForAction } from "../lib/plan.js";

const EXAM_KEY = "esbd.examDate";
const NPD_KEY = "esbd.newPerDay";
const getLocal = (k, fallback) => {
  try {
    return localStorage.getItem(k) ?? fallback;
  } catch {
    return fallback;
  }
};
const setLocal = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

function Segment({ pct, className, title }) {
  return pct > 0 ? <div className={className} style={{ width: `${pct}%` }} title={title} /> : null;
}

function TaskGroup({ icon, title, hint, action, items, records, onOpen }) {
  if (!items.length) return null;
  const step = stepForAction(action);
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-stone-800">
          {icon} {title} <span className="font-normal text-stone-400">({items.length})</span>
        </h3>
        <span className="text-xs text-stone-400">{hint}</span>
      </div>
      <ul className="mt-2 divide-y divide-stone-100">
        {items.map((q) => {
          const r = records[q.id];
          return (
            <li key={q.id}>
              <button
                onClick={() => onOpen(q.id, step)}
                className="flex w-full items-center gap-3 py-2 text-left transition hover:bg-stone-50"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-semibold text-stone-500">
                  {q.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-wide text-stone-400">{q.subject}</span>
                  <span className="line-clamp-1 text-sm text-stone-700">{q.title}</span>
                </span>
                {r && <span className="shrink-0 text-[10px] text-stone-400">box {r.box}</span>}
                <span className="shrink-0 text-sm text-stone-400">→</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Study plan (David's spiral): turns his current progress into a concrete daily to-do toward the exam.
export default function StudyPlan({ questions, onOpen }) {
  const { records } = useProgress();
  const [examDate, setExamDate] = useState(() => getLocal(EXAM_KEY, "2026-06-22"));
  const [newPerDay, setNewPerDay] = useState(() => Number(getLocal(NPD_KEY, "10")) || 10);

  const { counts, today } = useMemo(
    () => buildPlan(questions, records, { newPerDay }),
    [questions, records, newPerDay]
  );

  const total = questions.length;
  const days = daysUntil(examDate);
  const introducedSoFar = total - counts.new;
  const examinedSoFar = counts.examined;
  const introDaysNeeded = counts.new > 0 ? Math.ceil(counts.new / newPerDay) : 0;
  const projectedIntroDate = new Date();
  projectedIntroDate.setDate(projectedIntroDate.getDate() + introDaysNeeded);
  const introLate = introDaysNeeded > Math.max(0, days);

  const examLabel = new Date(examDate).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const seg = (n) => (n / total) * 100;
  const nothingToday =
    !today.introduce.length && !today.reinforce.length && !today.examine.length && !today.shoreUp.length;

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      {/* Header: countdown + settings */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Study plan</h1>
          <p className="mt-1 text-sm text-stone-500">
            {days > 0
              ? `Exam in ${days} day${days === 1 ? "" : "s"} · ${examLabel}`
              : days === 0
              ? `Exam is today · ${examLabel} 💪`
              : `Exam was ${examLabel}`}
          </p>
        </div>
        <div className="flex items-end gap-4">
          <label className="text-xs text-stone-500">
            <span className="mb-1 block">Exam date</span>
            <input
              type="date"
              value={examDate}
              onChange={(e) => {
                setExamDate(e.target.value);
                setLocal(EXAM_KEY, e.target.value);
              }}
              className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </label>
          <label className="text-xs text-stone-500">
            <span className="mb-1 block">New / day</span>
            <input
              type="number"
              min={1}
              max={total}
              value={newPerDay}
              onChange={(e) => {
                const n = Math.max(1, Math.min(total, Number(e.target.value) || 1));
                setNewPerDay(n);
                setLocal(NPD_KEY, String(n));
              }}
              className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </label>
        </div>
      </div>

      {/* Funnel across all questions (built from your current progress) */}
      <div className="mt-6">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100">
          <Segment pct={seg(counts.examined)} className="bg-green-500" title={`${counts.examined} examined`} />
          <Segment pct={seg(counts.reinforced)} className="bg-amber-400" title={`${counts.reinforced} reinforced`} />
          <Segment pct={seg(counts.introduced)} className="bg-sky-400" title={`${counts.introduced} introduced`} />
          <Segment pct={seg(counts.new)} className="bg-stone-300" title={`${counts.new} not started`} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />{counts.examined} examined</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{counts.reinforced} reinforced</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />{counts.introduced} introduced</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-stone-300" />{counts.new} not started</span>
        </div>
      </div>

      {/* Pace line */}
      <div
        className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
          introLate ? "border-amber-200 bg-amber-50 text-amber-800" : "border-stone-200 bg-stone-50 text-stone-600"
        }`}
      >
        Introduced <span className="font-semibold">{introducedSoFar}/{total}</span> · examined{" "}
        <span className="font-semibold">{examinedSoFar}/{total}</span> ({counts.ready} solid).{" "}
        {counts.new === 0
          ? "All questions introduced — keep reinforcing and examining. 🎉"
          : introLate
          ? `At ${newPerDay}/day you'd finish introducing in ${introDaysNeeded} days — after the exam. Raise “New / day”.`
          : `At ${newPerDay}/day you'll finish introducing in ${introDaysNeeded} day${
              introDaysNeeded === 1 ? "" : "s"
            } (by ${projectedIntroDate.toLocaleDateString(undefined, { day: "numeric", month: "short" })}).`}
      </div>

      {/* Today's plan */}
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-400">Today's plan</h2>
      {nothingToday ? (
        <p className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
          {counts.new === 0 && counts.introduced === 0 && counts.reinforced === 0
            ? "You're exam-ready — everything examined and solid. 💪"
            : "Nothing queued right now. Add more “New / day” or check Today for due reviews."}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <TaskGroup icon="🔁" title="Reinforce" hint="Flashcards" action="reinforce" items={today.reinforce} records={records} onOpen={onOpen} />
          <TaskGroup icon="🎙️" title="Examine" hint="Examiner" action="examine" items={today.examine} records={records} onOpen={onOpen} />
          <TaskGroup icon="⭐" title="Shore up weak" hint="Examiner again" action="shore-up" items={today.shoreUp} records={records} onOpen={onOpen} />
          <TaskGroup icon="🆕" title="Introduce new" hint="Read + Blanks" action="introduce" items={today.introduce} records={records} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}
