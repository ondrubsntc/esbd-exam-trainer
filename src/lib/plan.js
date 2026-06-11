// Study-plan logic: turn each question's progress into "what to do next", following David's
// spiral passes — Read+Blanks → Flashcards → Examiner → Examiner-again on the weak ones.
import { classify } from "./queue.js";
import { buildThemeIndex } from "./similarity.js";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysUntil(examDate, now = new Date()) {
  return Math.round((startOfDay(examDate) - startOfDay(now)) / 86400000);
}

// A question is "done today" if it has any progress event dated today (read/blanks/flashcard/
// examiner all log a timestamped history entry). Such questions drop off today's plan.
function touchedToday(record, now) {
  if (!record?.history?.length) return false;
  const start = startOfDay(now).getTime();
  return record.history.some((h) => new Date(h.ts).getTime() >= start);
}

// Memoise the thematic order (greedy similarity chain) per questions array reference.
let themeCache = { questions: null, index: new Map() };
function themeIndexFor(questions) {
  if (themeCache.questions !== questions) {
    themeCache = { questions, index: buildThemeIndex(questions) };
  }
  return themeCache.index;
}

// The single next action for a question. Steps that open: introduce→1, reinforce→3, examine/shore-up→5.
export function nextAction(record, now = new Date()) {
  const s = record?.steps;
  if (!record || !s || !(s.read && s.blanks)) return "introduce";
  if (!s.flashcard) return "reinforce";
  if (!s.examiner) return "examine";
  const weak = record.box < 4 || (record.lastExaminerScore != null && record.lastExaminerScore <= 3);
  if (weak || classify(record, now) === "due") return "shore-up";
  return "ready";
}

const STEP_FOR = { introduce: 1, reinforce: 3, examine: 5, "shore-up": 5 };
export const stepForAction = (action) => STEP_FOR[action] ?? 1;

export function buildPlan(questions, records, { dailyTarget = 12, now = new Date() } = {}) {
  const counts = { new: 0, introduced: 0, reinforced: 0, examined: 0, ready: 0 };
  const all = { introduce: [], reinforce: [], examine: [], shoreUp: [] };
  let doneToday = 0;

  for (const q of questions) {
    const r = records[q.id];
    const s = r?.steps;
    const introduced = !!(s && s.read && s.blanks);

    // Mutually-exclusive stage counts (sum to total); `ready` is a subset of `examined`.
    if (!introduced) counts.new += 1;
    else if (!s.flashcard) counts.introduced += 1;
    else if (!s.examiner) counts.reinforced += 1;
    else {
      counts.examined += 1;
      if (r.box >= 4) counts.ready += 1;
    }

    // Already worked on today → counts as done, and is held back from today's remaining plan.
    if (touchedToday(r, now)) {
      doneToday += 1;
      continue;
    }

    const action = nextAction(r, now);
    if (action === "introduce") all.introduce.push(q);
    else if (action === "reinforce") all.reinforce.push(q);
    else if (action === "examine") all.examine.push(q);
    else if (action === "shore-up") all.shoreUp.push(q);
  }

  // Order introduce/reinforce/examine by theme so related questions (across subjects) sit together.
  const theme = themeIndexFor(questions);
  const byTheme = (a, b) => (theme.get(a.id) ?? 0) - (theme.get(b.id) ?? 0);
  all.introduce.sort(byTheme);
  all.reinforce.sort(byTheme);
  all.examine.sort(byTheme);
  // Weakest-first for the shore-up pass (lowest box, then lowest last examiner score).
  all.shoreUp.sort((a, b) => {
    const ra = records[a.id];
    const rb = records[b.id];
    return ra.box - rb.box || (ra.lastExaminerScore ?? 9) - (rb.lastExaminerScore ?? 9);
  });

  // Round-robin across the activity types up to the daily budget, so a day is bounded and the
  // passes interleave (a few new Read+Blanks, a few of yesterday's Flashcards, a few Examiner…)
  // instead of dumping every pending task at once.
  const pools = {
    reinforce: [...all.reinforce],
    examine: [...all.examine],
    shoreUp: [...all.shoreUp],
    introduce: [...all.introduce],
  };
  const order = ["reinforce", "examine", "shoreUp", "introduce"];
  const today = { reinforce: [], examine: [], shoreUp: [], introduce: [] };
  let budget = Math.max(0, dailyTarget - doneToday); // what's left of today's allowance
  let moved = true;
  while (budget > 0 && moved) {
    moved = false;
    for (const key of order) {
      if (budget <= 0) break;
      if (pools[key].length) {
        today[key].push(pools[key].shift());
        budget -= 1;
        moved = true;
      }
    }
  }

  // Passes still needed to get every question examined at least once (drives the pace estimate).
  const remainingPasses = counts.new * 3 + counts.introduced * 2 + counts.reinforced;
  const pending = {
    introduce: all.introduce.length,
    reinforce: all.reinforce.length,
    examine: all.examine.length,
    shoreUp: all.shoreUp.length,
  };

  return { counts, today, remainingPasses, pending, doneToday, dailyTarget };
}
