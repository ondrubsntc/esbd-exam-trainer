import { useMemo } from "react";
import { useProgress } from "../state/progress.jsx";
import { buildPlan } from "../lib/plan.js";
import TodayTasks from "./TodayTasks.jsx";

const getNewPerDay = () => {
  try {
    return Number(localStorage.getItem("esbd.newPerDay")) || 10;
  } catch {
    return 10;
  }
};

// Today = the actionable slice of your Study plan: what to do right now (introduce / reinforce /
// examine / shore up), driven by your current progress.
export default function QueueHome({ questions, onOpen, onCommission }) {
  const { records } = useProgress();
  const { counts, today } = useMemo(
    () => buildPlan(questions, records, { newPerDay: getNewPerDay() }),
    [questions, records]
  );

  const taskCount =
    today.reinforce.length + today.examine.length + today.shoreUp.length + today.introduce.length;

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Today</h1>
          <p className="mt-1 text-sm text-stone-500">
            {taskCount} task{taskCount === 1 ? "" : "s"} from your plan · {counts.examined}/{questions.length} examined
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
            Nothing queued right now. Open <span className="font-medium">Study plan</span> to set your pace, or try
            Commission mode.
          </p>
        ) : (
          <TodayTasks today={today} records={records} onOpen={onOpen} />
        )}
      </div>
    </div>
  );
}
