// Today / Due queue logic (spec §3). A question is:
//  - "due"      — has an SRS due date that has arrived (review it)
//  - "new"      — never entered spaced repetition yet (no record, or never rated)
//  - "upcoming" — scheduled, but the due date is still in the future
export function classify(record, now = new Date()) {
  if (!record || !record.due) return "new";
  return new Date(record.due) <= now ? "due" : "upcoming";
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
