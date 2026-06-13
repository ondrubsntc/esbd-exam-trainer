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
export const ACTION_GROUP = { introduce: "introduce", reinforce: "reinforce", examine: "examine", "shore-up": "shoreUp" };

// Local calendar-day key, e.g. "2026-6-13" — used to scope the saved daily plan.
export function dayKey(now = new Date()) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Read-only snapshot of progress: stage counts, pending pools per action (theme-sorted, excluding
// anything already worked on today), which ids are done today, and each question's next action.
export function analyzeProgress(questions, records, now = new Date()) {
  const counts = { new: 0, introduced: 0, reinforced: 0, examined: 0, ready: 0 };
  const pools = { reinforce: [], examine: [], shoreUp: [], introduce: [] };
  const doneTodayIds = new Set();
  const actionById = new Map();
  const questionById = new Map();

  for (const q of questions) {
    questionById.set(q.id, q);
    const r = records[q.id];
    const s = r?.steps;
    const introduced = !!(s && s.read && s.blanks);

    if (!introduced) counts.new += 1;
    else if (!s.flashcard) counts.introduced += 1;
    else if (!s.examiner) counts.reinforced += 1;
    else {
      counts.examined += 1;
      if (r.box >= 4) counts.ready += 1;
    }

    const action = nextAction(r, now);
    actionById.set(q.id, action);

    if (touchedToday(r, now)) {
      doneTodayIds.add(q.id);
      continue; // worked on today → not a pending candidate
    }
    const group = ACTION_GROUP[action];
    if (group) pools[group].push(q);
  }

  // Related questions (across subjects) sit together; shore-up weakest-first.
  const theme = themeIndexFor(questions);
  const byTheme = (a, b) => (theme.get(a.id) ?? 0) - (theme.get(b.id) ?? 0);
  pools.introduce.sort(byTheme);
  pools.reinforce.sort(byTheme);
  pools.examine.sort(byTheme);
  pools.shoreUp.sort((a, b) => {
    const ra = records[a.id];
    const rb = records[b.id];
    return ra.box - rb.box || (ra.lastExaminerScore ?? 9) - (rb.lastExaminerScore ?? 9);
  });

  const remainingPasses = counts.new * 3 + counts.introduced * 2 + counts.reinforced;
  return { counts, pools, doneTodayIds, actionById, questionById, remainingPasses };
}

// Round-robin across the activity types up to `budget`, interleaving the passes (a few Flashcards,
// a few Examiner, a few new Read+Blanks…). Returns question ids; never picks ids in `exclude`.
export function selectRoundRobin(pools, budget, exclude = new Set()) {
  const order = ["reinforce", "examine", "shoreUp", "introduce"];
  const queues = {};
  for (const k of order) queues[k] = pools[k].filter((q) => !exclude.has(q.id));
  const idx = { reinforce: 0, examine: 0, shoreUp: 0, introduce: 0 };
  const picked = [];
  let left = Math.max(0, budget);
  let moved = true;
  while (left > 0 && moved) {
    moved = false;
    for (const k of order) {
      if (left <= 0) break;
      if (idx[k] < queues[k].length) {
        picked.push(queues[k][idx[k]].id);
        idx[k] += 1;
        left -= 1;
        moved = true;
      }
    }
  }
  return picked;
}
