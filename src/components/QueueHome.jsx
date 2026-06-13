import { useProgress } from "../state/progress.jsx";
import { useTodayPlan } from "../state/useTodayPlan.js";
import TodayTasks from "./TodayTasks.jsx";

const getDailyTarget = () => {
  try {
    return Number(localStorage.getItem("esbd.dailyTarget")) || 12;
  } catch {
    return 12;
  }
};

// Today = the actionable slice of your Study plan: the same fixed daily task set (introduce /
// reinforce / examine / shore up), so completing a task removes only that task.
export default function QueueHome({ questions, onOpen, onCommission }) {
  const { records } = useProgress();
  const { counts, today, doneToday, left: taskCount } = useTodayPlan(questions, records, getDailyTarget());

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Today</h1>
          <p className="mt-1 text-sm text-stone-500">
            {doneToday > 0 && `${doneToday} done · `}
            {taskCount} left today · {counts.examined}/{questions.length} examined
          </p>
        </div>
        <button
          onClick={onCommission}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          Commission mode →
        </button>
      </div>

      <div className="mt-8">
        {taskCount === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-200 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
            {doneToday > 0
              ? `Done for today 🎉 — ${doneToday} ${doneToday === 1 ? "activity" : "activities"} completed. Come back tomorrow.`
              : "Nothing queued right now. Open Study plan to set your pace, or try Commission mode."}
          </p>
        ) : (
          <TodayTasks today={today} records={records} onOpen={onOpen} />
        )}
      </div>
    </div>
  );
}
