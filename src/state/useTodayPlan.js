import { useEffect, useMemo, useState } from "react";
import { analyzeProgress, dayKey, selectRoundRobin } from "../lib/plan.js";

// Today's plan is a FIXED set chosen once per day and saved, so completing a task only removes that
// task — the rest never reshuffle. It rebuilds when the calendar day changes; raising "Tasks/day"
// only appends. (Was recomputed from scratch each change, which caused surprise swaps.)
const KEY = "esbd.todayPlan";
const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};
const writeStore = (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

// First set of the day = questions already done today + a round-robin pick of pending ones.
function buildAssigned(analysis, dailyTarget) {
  const done = [...analysis.doneTodayIds];
  const room = Math.max(0, dailyTarget - done.length);
  return [...done, ...selectRoundRobin(analysis.pools, room, new Set(done))];
}

export function useTodayPlan(questions, records, dailyTarget) {
  const today = dayKey(new Date());
  const analysis = useMemo(
    () => analyzeProgress(questions, records, new Date()),
    [questions, records]
  );

  const [assigned, setAssigned] = useState(() => {
    const stored = readStore();
    if (stored && stored.date === today && Array.isArray(stored.ids)) return stored.ids;
    const ids = buildAssigned(analysis, dailyTarget);
    writeStore({ date: today, ids });
    return ids;
  });

  // Rebuild on a new day; top up (append only) if the daily target grew. NOT keyed on records, so
  // completing a task never rebuilds the set — that's what keeps the list stable.
  useEffect(() => {
    setAssigned((prev) => {
      const stored = readStore();
      if (!stored || stored.date !== today) {
        const ids = buildAssigned(analysis, dailyTarget);
        writeStore({ date: today, ids });
        return ids;
      }
      let ids = stored.ids;
      if (ids.length < dailyTarget) {
        const extra = selectRoundRobin(analysis.pools, dailyTarget - ids.length, new Set(ids));
        if (extra.length) {
          ids = [...ids, ...extra];
          writeStore({ date: today, ids });
        }
      }
      return ids;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, dailyTarget]);

  // Derive groups + counts from the (stable) assigned set and the (live) analysis.
  const derived = useMemo(() => {
    const groups = { reinforce: [], examine: [], shoreUp: [], introduce: [] };
    let doneCount = 0;
    for (const id of assigned) {
      if (analysis.doneTodayIds.has(id)) {
        doneCount += 1;
        continue;
      }
      const q = analysis.questionById.get(id);
      const action = analysis.actionById.get(id);
      if (!q) continue;
      if (action === "reinforce") groups.reinforce.push(q);
      else if (action === "examine") groups.examine.push(q);
      else if (action === "shore-up") groups.shoreUp.push(q);
      else if (action === "introduce") groups.introduce.push(q);
      // "ready" (finished) → not shown
    }
    const left = groups.reinforce.length + groups.examine.length + groups.shoreUp.length + groups.introduce.length;
    return { groups, doneCount, left };
  }, [assigned, analysis]);

  return {
    counts: analysis.counts,
    remainingPasses: analysis.remainingPasses,
    today: derived.groups,
    doneToday: derived.doneCount,
    left: derived.left,
    dailyTarget,
  };
}
