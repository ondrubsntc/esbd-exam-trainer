// The 5-step learning workflow. The user can jump to any step (esp. Step 5).
// A completed step (from the progress record) shows a check instead of its number.
export const STEPS = [
  { n: 1, key: "read", label: "Read" },
  { n: 2, key: "blanks", label: "Blanks" },
  { n: 3, key: "flashcard", label: "Flashcards" },
  { n: 4, key: "connect", label: "Connect" },
  { n: 5, key: "examiner", label: "Examiner" },
];

export default function StepTracker({ step, onStepChange, record }) {
  const steps = record?.steps ?? {};
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((s) => {
        const active = s.n === step;
        const done = !!steps[s.key];
        return (
          <button
            key={s.n}
            onClick={() => onStepChange(s.n)}
            className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
              active
                ? "bg-stone-800 text-white"
                : "border border-stone-200 bg-white text-stone-500 hover:bg-stone-100"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                active
                  ? "bg-white text-stone-800"
                  : done
                  ? "bg-green-500 text-white"
                  : "bg-stone-100 text-stone-500 group-hover:bg-stone-200"
              }`}
            >
              {done && !active ? "✓" : s.n}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
