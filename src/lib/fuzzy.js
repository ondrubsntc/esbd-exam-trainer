// Loose matching for the fill-in-the-blanks step. The goal is recalling the concept, not
// exact spelling — so we normalise hard and allow a small edit distance.

export function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, " ") // punctuation/spacing → single spaces
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

// True if `guess` is "close enough" to `answer`.
export function isLooseMatch(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g) return false;
  if (g === a) return true;
  // allow the right idea phrased loosely (one contains the other) for multi-word answers
  if (a.includes(" ") && (a.includes(g) || g.includes(a)) && g.length >= 3) return true;
  const tolerance = Math.max(1, Math.floor(a.length / 5));
  return levenshtein(g, a) <= tolerance;
}
