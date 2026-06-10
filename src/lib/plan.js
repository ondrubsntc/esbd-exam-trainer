// Study-plan logic: turn each question's progress into "what to do next", following David's
// spiral passes — Read+Blanks → Flashcards → Examiner → Examiner-again on the weak ones.
import { classify } from "./queue.js";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysUntil(examDate, now = new Date()) {
  return Math.round((startOfDay(examDate) - startOfDay(now)) / 86400000);
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

export function buildPlan(questions, records, { newPerDay = 10, now = new Date() } = {}) {
  const counts = { new: 0, introduced: 0, reinforced: 0, examined: 0, ready: 0 };
  const groups = { introduce: [], reinforce: [], examine: [], shoreUp: [] };

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

    const action = nextAction(r, now);
    if (action === "introduce") groups.introduce.push(q);
    else if (action === "reinforce") groups.reinforce.push(q);
    else if (action === "examine") groups.examine.push(q);
    else if (action === "shore-up") groups.shoreUp.push(q);
  }

  // Weakest-first for the shore-up pass (lowest box, then lowest last examiner score).
  groups.shoreUp.sort((a, b) => {
    const ra = records[a.id];
    const rb = records[b.id];
    return ra.box - rb.box || (ra.lastExaminerScore ?? 9) - (rb.lastExaminerScore ?? 9);
  });

  const today = {
    introduce: groups.introduce.slice(0, newPerDay),
    reinforce: groups.reinforce,
    examine: groups.examine,
    shoreUp: groups.shoreUp.slice(0, 8),
  };

  return { counts, today, introduceRemaining: groups.introduce.length };
}
