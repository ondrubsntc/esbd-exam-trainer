import { useProgress } from "../state/progress.jsx";
import { boxPillClass } from "../lib/boxColor.js";

const NAV = [
  { id: "home", label: "Today", icon: "📅" },
  { id: "plan", label: "Study plan", icon: "🗺️" },
  { id: "commission", label: "Commission mode", icon: "🎓" },
  { id: "dashboard", label: "Readiness", icon: "📊" },
];

export default function Sidebar({ subjects, questions, view, selectedId, onNavigate, onSelect }) {
  const { getRecord } = useProgress();

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-5 py-4">
        <h1 className="text-lg font-semibold text-stone-800">ESBD Exam Trainer</h1>
        <p className="mt-0.5 text-xs text-stone-500">
          {questions.length} questions · {subjects.length} subjects
        </p>
      </div>

      {/* Mode navigation */}
      <div className="border-b border-stone-200 p-2">
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <span aria-hidden>{n.icon}</span>
              {n.label}
            </button>
          );
        })}
      </div>

      {/* Subjects → questions */}
      <nav className="flex-1 overflow-y-auto py-2">
        {subjects.map((subject) => {
          const qs = questions.filter((q) => q.subjectId === subject.id);
          return (
            <section key={subject.id} className="py-2">
              <h2 className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                {subject.name}
              </h2>
              <ul>
                {qs.map((q) => {
                  const active = view === "question" && q.id === selectedId;
                  const record = getRecord(q.id);
                  const allDone = record && Object.values(record.steps).every(Boolean);
                  return (
                    <li key={q.id}>
                      <button
                        onClick={() => onSelect(q.id)}
                        className={`flex w-full items-start gap-3 px-5 py-2 text-left transition hover:bg-stone-50 ${
                          active ? "bg-stone-100" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                            active ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {q.number}
                        </span>
                        <span
                          className={`line-clamp-2 min-w-0 flex-1 text-sm leading-snug ${
                            active ? "font-medium text-stone-900" : "text-stone-600"
                          }`}
                        >
                          {q.title}
                        </span>
                        {record && (
                          <span
                            className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${boxPillClass(
                              record.box
                            )}`}
                            title={`Leitner box ${record.box}${allDone ? " · all steps done" : ""}`}
                          >
                            {allDone && "✓"}B{record.box}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
