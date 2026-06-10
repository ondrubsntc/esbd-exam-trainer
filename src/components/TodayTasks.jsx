import { stepForAction } from "../lib/plan.js";
import { boxPillClass } from "../lib/boxColor.js";

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
                {r && (
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${boxPillClass(r.box)}`}>
                    B{r.box}
                  </span>
                )}
                <span className="shrink-0 text-sm text-stone-400">→</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// The shared "today's plan" task groups, used by both Study plan and Today.
export default function TodayTasks({ today, records, onOpen }) {
  return (
    <div className="space-y-3">
      <TaskGroup icon="🔁" title="Reinforce" hint="Flashcards" action="reinforce" items={today.reinforce} records={records} onOpen={onOpen} />
      <TaskGroup icon="🎙️" title="Examine" hint="Examiner" action="examine" items={today.examine} records={records} onOpen={onOpen} />
      <TaskGroup icon="⭐" title="Shore up weak" hint="Examiner again" action="shore-up" items={today.shoreUp} records={records} onOpen={onOpen} />
      <TaskGroup icon="🆕" title="Introduce new" hint="Read + Blanks" action="introduce" items={today.introduce} records={records} onOpen={onOpen} />
    </div>
  );
}
