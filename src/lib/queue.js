// Today / Due queue logic (spec §3). A question is:
//  - "due"      — its review day has arrived (today or earlier) → review it
//  - "new"      — never entered spaced repetition yet (no record, or never rated)
//  - "upcoming" — scheduled for a future day
// Compare by calendar DAY, not exact time, so a question due later today still counts as due.
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function classify(record, now = new Date()) {
  if (!record || !record.due) return "new";
  return startOfDay(record.due) <= startOfDay(now) ? "due" : "upcoming";
}

// Friendly relative label for a future due date: "tomorrow", "in 3 days", or a date.
export function dueLabel(due, now = new Date()) {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return `in ${days} days`;
  return new Date(due).toLocaleDateString();
}

// Round-robin across subjects so reviews interleave instead of blocking by subject.
function interleaveBySubject(items) {
  const bySubject = new Map();
  for (const it of items) {
    if (!bySubject.has(it.subjectId)) bySubject.set(it.subjectId, []);
    bySubject.get(it.subjectId).push(it);
  }
  const lists = [...bySubject.values()];
  const out = [];
  for (let i = 0; ; i++) {
    let any = false;
    for (const list of lists) {
      if (i < list.length) {
        out.push(list[i]);
        any = true;
      }
    }
    if (!any) break;
  }
  return out;
}

export function buildQueue(questions, records, now = new Date()) {
  const due = [];
  const fresh = [];
  const upcoming = [];
  for (const q of questions) {
    const c = classify(records[q.id], now);
    if (c === "due") due.push(q);
    else if (c === "new") fresh.push(q);
    else upcoming.push(q);
  }
  // Sort upcoming by soonest due so the "next up" reads naturally.
  upcoming.sort((a, b) => new Date(records[a.id].due) - new Date(records[b.id].due));
  return { due: interleaveBySubject(due), fresh, upcoming };
}
