import { useProgress } from "../state/progress.jsx";
import { buildQueue } from "../lib/queue.js";

const BOX_CLASSES = {
  1: "bg-red-100 text-red-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-lime-100 text-lime-700",
  5: "bg-green-100 text-green-700",
};

function QueueCard({ q, record, action, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left transition hover:border-stone-300 hover:bg-stone-50"
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
        {q.number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-400">{q.subject}</span>
        <span className="line-clamp-1 text-sm font-medium text-stone-800">{q.title}</span>
      </span>
      {record && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BOX_CLASSES[record.box]}`}>
          B{record.box}
        </span>
      )}
      <span className="shrink-0 text-sm font-medium text-stone-400">{action} →</span>
    </button>
  );
}

// Default landing view (spec §3): due reviews (interleaved) + new questions to start.
export default function QueueHome({ questions, onOpen, onCommission }) {
  const { records } = useProgress();
  const { due, fresh, upcoming } = buildQueue(questions, records);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Today</h1>
          <p className="mt-1 text-sm text-stone-500">
            {due.length} due · {fresh.length} new · {upcoming.length} scheduled
          </p>
        </div>
        <button
          onClick={onCommission}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          Commission mode →
        </button>
      </div>

      {/* Due reviews */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
          Due for review {due.length > 0 && `(${due.length})`}
        </h2>
        {due.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-200 bg-white/60 px-4 py-6 text-center text-sm text-stone-400">
            Nothing due right now. Start a new question below or run Commission mode.
          </p>
        ) : (
          <div className="space-y-2">
            {due.map((q) => (
              <QueueCard key={q.id} q={q} record={records[q.id]} action="Review" onClick={() => onOpen(q.id, 3)} />
            ))}
          </div>
        )}
      </section>

      {/* New questions */}
      {fresh.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">New ({fresh.length})</h2>
          <div className="space-y-2">
            {fresh.slice(0, 8).map((q) => (
              <QueueCard key={q.id} q={q} record={records[q.id]} action="Start" onClick={() => onOpen(q.id, 1)} />
            ))}
          </div>
          {fresh.length > 8 && (
            <p className="mt-2 text-xs text-stone-400">+ {fresh.length - 8} more new questions in the sidebar</p>
          )}
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">Scheduled</h2>
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white/60 px-4 py-2.5 text-sm text-stone-400"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-semibold">
                  {q.number}
                </span>
                <span className="line-clamp-1 flex-1">{q.title}</span>
                <span className="shrink-0 text-xs">due {new Date(records[q.id].due).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
