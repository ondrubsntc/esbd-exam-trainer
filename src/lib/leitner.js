// Spaced repetition — Leitner box (build spec §4). One small, well-named module so the
// schedule is easy to tweak. All functions are pure and return a new record.

export const BOX_INTERVALS_DAYS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
export const MIN_BOX = 1;
export const MAX_BOX = 5;

const clampBox = (b) => Math.max(MIN_BOX, Math.min(MAX_BOX, b));

// Due date = `from` + the interval for `box`, as an ISO string.
export function nextDue(box, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + BOX_INTERVALS_DAYS[clampBox(box)]);
  return d.toISOString();
}

export function createRecord(questionId) {
  return {
    questionId,
    box: 1,
    due: null, // unscheduled until the first SRS rating
    steps: { read: false, blanks: false, flashcard: false, connect: false, examiner: false },
    lastExaminerScore: null,
    lastConfidence: null,
    history: [],
  };
}

function transition(record, box, now, entry) {
  const clamped = clampBox(box);
  return {
    ...record,
    box: clamped,
    due: nextDue(clamped, now),
    history: [...record.history, { ts: now.toISOString(), ...entry }],
  };
}

// Flashcard self-rating: Again → box 1; Hard → stay; Good → +1; Easy → +2.
export const FLASHCARD_RATINGS = ["again", "hard", "good", "easy"]; // worst → best
const FLASHCARD_DELTA = { again: null, hard: 0, good: 1, easy: 2 };

export function applyFlashcardRating(record, rating, now = new Date()) {
  const delta = FLASHCARD_DELTA[rating];
  const box = delta === null ? 1 : record.box + delta;
  return { ...transition(record, box, now, { event: "flashcard", rating }), lastConfidence: rating };
}

// Average the deck's ratings into one representative rating (again<hard<good<easy), so a
// single weak card among strong ones doesn't drag the whole box down.
const RATING_POINTS = { again: 0, hard: 1, good: 2, easy: 3 };
export function averageRating(ratings) {
  if (!ratings.length) return "good";
  const avg = ratings.reduce((sum, r) => sum + (RATING_POINTS[r] ?? 1), 0) / ratings.length;
  const idx = Math.max(0, Math.min(3, Math.round(avg)));
  return FLASHCARD_RATINGS[idx];
}

// Examiner score sets the box directly — it's the closest thing to the real exam, so your score
// is the best estimate of your level: 5 → box 5, 4 → box 4, 3 → box 3. It never lowers a box you've
// already reached (a good answer shouldn't demote you); a weak answer (≤ 2) resets to box 1.
export function applyExaminerScore(record, score, now = new Date()) {
  const box = score <= 2 ? 1 : Math.max(record.box, score);
  return { ...transition(record, box, now, { event: "examiner", score }), lastExaminerScore: score };
}
