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

// Most conservative rating across a deck (you're only as solid as your weakest chunk).
export function worstRating(ratings) {
  if (!ratings.length) return "good";
  return ratings.reduce(
    (worst, r) => (FLASHCARD_RATINGS.indexOf(r) < FLASHCARD_RATINGS.indexOf(worst) ? r : worst),
    "easy"
  );
}

// Examiner score (§5): score ≥ 4 → +1 box; score = 3 → stay; score ≤ 2 → box 1. (Used in M4.)
export function applyExaminerScore(record, score, now = new Date()) {
  let box;
  if (score >= 4) box = record.box + 1;
  else if (score === 3) box = record.box;
  else box = 1;
  return { ...transition(record, box, now, { event: "examiner", score }), lastExaminerScore: score };
}
