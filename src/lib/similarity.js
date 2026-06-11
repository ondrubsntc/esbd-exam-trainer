// Lightweight topic similarity so the plan can recommend related questions ACROSS subjects
// back-to-back. Uses shared title/key-term vocabulary (Jaccard) — no AI, no cost.
const STOP = new Set(
  ("the a an and or of to in for on with within its is are as at by from how what its role level " +
    "essential tools small company business application analysis main concept concepts use using basic " +
    "general into not it's their they your you we our two three four model models method methods plus " +
    "vs and/or etc more most each other others part parts type types kind set sets")
    .split(/\s+/)
);

function tokenize(q) {
  const text = `${q.title} ${(q.theory?.keyTerms || []).join(" ")} ${q.examArea || ""}`.toLowerCase();
  const toks = text
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return new Set(toks);
}

function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}

// Greedy nearest-neighbour chain: start at the first question, then repeatedly append the most
// similar remaining one. Adjacent ranks end up thematically related, naturally crossing subjects.
// Returns a Map<questionId, rank>.
export function buildThemeIndex(questions) {
  const toks = questions.map(tokenize);
  const n = questions.length;
  if (!n) return new Map();
  const used = new Array(n).fill(false);
  const order = [0];
  used[0] = true;
  let cur = 0;
  for (let step = 1; step < n; step++) {
    let best = -1;
    let bestSim = -Infinity;
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const sim = jaccard(toks[cur], toks[j]);
      if (sim > bestSim) {
        bestSim = sim;
        best = j;
      }
    }
    used[best] = true;
    order.push(best);
    cur = best;
  }
  const index = new Map();
  order.forEach((qi, rank) => index.set(questions[qi].id, rank));
  return index;
}
