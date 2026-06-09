// Parse src/data/source.md (clean markdown produced by scripts/convert-docx.mjs) into
// src/data/questions.json, then print a verification summary (build spec §1.1 / §1.2).
//
// Run: npm run parse  (after `npm run convert`).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = path.join("src", "data", "source.md");
const OUT = path.join("src", "data", "questions.json");

const SUBJECT_RE = /^# ESBD State Exam\s+—\s+(.+)$/;
const QUESTION_RE = /^## Q(\d+)\s+—\s+(.+)$/;
const H2_RE = /^## /; // any level-2 heading (questions OR dividers like "## Study Material: …")
const THEORY_RE = /^### THEORY\s*$/;
const PRACTICAL_RE = /^### PRACTICAL APPLICATION\s*$/;

function slugFor(name) {
  const n = name.toLowerCase();
  if (n.includes("strategic")) return "strategic";
  if (n.includes("management")) return "management";
  if (n.includes("entrepreneur")) return "entrepreneurship";
  return n.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Split a section's markdown into chunks: blocks separated by blank lines. A contiguous
// bullet group (no blank lines between items) stays together as one chunk.
function toChunks(raw) {
  return raw
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Distinct **bold** spans inside theory = blank candidates for the optional fill-in step.
function collectKeyTerms(raw) {
  const seen = new Set();
  const out = [];
  for (const m of raw.matchAll(/\*\*(.+?)\*\*/g)) {
    const term = m[1].replace(/\*/g, "").replace(/\s*[:.]\s*$/, "").trim();
    const key = term.toLowerCase();
    if (term && !seen.has(key)) {
      seen.add(key);
      out.push(term);
    }
  }
  return out;
}

const stripEmphasis = (s) => s.replace(/\*\*?/g, "").trim();

const src = await readFile(SRC, "utf8");
const lines = src.split("\n");

const subjects = [];
let curSubject = null;
let curQuestion = null;
let section = null; // "examArea" | "theory" | "practical"
let buf = { examArea: [], theory: [], practical: [] };

function flushQuestion() {
  if (!curQuestion) return;
  const theoryRaw = buf.theory.join("\n").trim();
  const practicalRaw = buf.practical.join("\n").trim();
  const examAreaRaw = buf.examArea.join("\n").trim();
  curQuestion.examArea = examAreaRaw ? stripEmphasis(examAreaRaw) : null;
  curQuestion.theory = {
    raw: theoryRaw,
    chunks: toChunks(theoryRaw),
    keyTerms: collectKeyTerms(theoryRaw),
  };
  curQuestion.practical = {
    raw: practicalRaw,
    chunks: toChunks(practicalRaw),
  };
  curSubject.questions.push(curQuestion);
  curQuestion = null;
  section = null;
  buf = { examArea: [], theory: [], practical: [] };
}

for (const line of lines) {
  let m;
  if ((m = line.match(SUBJECT_RE))) {
    flushQuestion();
    const name = m[1].trim();
    curSubject = { id: slugFor(name), name, questions: [] };
    subjects.push(curSubject);
    continue;
  }
  if ((m = line.match(QUESTION_RE))) {
    flushQuestion();
    curQuestion = {
      id: `${curSubject.id}-q${Number(m[1])}`,
      subjectId: curSubject.id,
      subject: curSubject.name,
      number: Number(m[1]),
      title: m[2].trim(),
    };
    section = "examArea"; // anything until ### THEORY is the optional exam-area note
    continue;
  }
  if (THEORY_RE.test(line)) {
    if (curQuestion) section = "theory";
    continue;
  }
  if (PRACTICAL_RE.test(line)) {
    if (curQuestion) section = "practical";
    continue;
  }
  // A non-question level-2 heading (divider) ends the current question and is not content.
  if (H2_RE.test(line) && !QUESTION_RE.test(line)) {
    flushQuestion();
    continue;
  }
  // Ordinary content (incl. ### Purchasing / ### Sales management sub-headers — kept in body).
  if (curQuestion && section) buf[section].push(line);
}
flushQuestion();

const questions = subjects.flatMap((s) => s.questions);
const output = {
  generatedAt: new Date().toISOString(),
  subjects: subjects.map((s) => ({ id: s.id, name: s.name, questionCount: s.questions.length })),
  questions,
};

await writeFile(OUT, JSON.stringify(output, null, 2) + "\n", "utf8");

// ---------------------------------------------------------------------------
// Verification summary
// ---------------------------------------------------------------------------
const expected = {
  strategic: { count: 19, label: "Strategic Development (Q1–9, Q11–20; no Q10 by design)" },
  management: { count: 20, label: "Management & Economics (Q1–20)" },
  entrepreneurship: { count: 20, label: "Entrepreneurship & Business Plan (Q1–20)" },
};

console.log(`\nParsed ${SRC} -> ${OUT}`);
console.log("=".repeat(72));
console.log(`Subjects found: ${subjects.length} (expected 3)`);

let problems = 0;
let totalKeyTerms = 0;
let withExamArea = 0;

for (const s of subjects) {
  const nums = s.questions.map((q) => q.number).sort((a, b) => a - b);
  const exp = expected[s.id];
  const ok = exp && s.questions.length === exp.count;
  console.log(`\n• ${s.name}  [${s.id}]`);
  console.log(`    questions: ${s.questions.length}${exp ? ` / expected ${exp.count}` : ""}  ${ok ? "✓" : exp ? "✗ MISMATCH" : ""}`);
  console.log(`    numbers:   ${nums.join(", ")}`);

  // Duplicate numbers?
  const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
  if (dupes.length) {
    console.log(`    ✗ duplicate question numbers: ${[...new Set(dupes)].join(", ")}`);
    problems++;
  }
  if (exp && !ok) problems++;

  // Empty THEORY / PRACTICAL blocks
  for (const q of s.questions) {
    if (!q.theory.raw) {
      console.log(`    ✗ Q${q.number} has EMPTY theory`);
      problems++;
    }
    if (!q.practical.raw) {
      console.log(`    ✗ Q${q.number} has EMPTY practical`);
      problems++;
    }
    totalKeyTerms += q.theory.keyTerms.length;
    if (q.examArea) withExamArea++;
  }
}

const total = questions.length;
console.log("\n" + "-".repeat(72));
console.log(`Total questions: ${total} (expected 59)`);
console.log(`examArea (okruh) present on: ${withExamArea}/${total} questions; ${total - withExamArea} have none (stored as null — optional, fine)`);
console.log(`keyTerms collected: ${totalKeyTerms} across all questions (avg ${(totalKeyTerms / total).toFixed(1)}/question)`);

// Sample one question so we can eyeball the parse quality
const sample = questions[0];
console.log("\nSample — first question:");
console.log(`  id:        ${sample.id}`);
console.log(`  title:     ${sample.title}`);
console.log(`  theory:    ${sample.theory.chunks.length} chunks, ${sample.theory.keyTerms.length} keyTerms`);
console.log(`  practical: ${sample.practical.chunks.length} chunks`);
console.log(`  keyTerms:  ${sample.theory.keyTerms.slice(0, 8).join(" · ")}${sample.theory.keyTerms.length > 8 ? " …" : ""}`);

console.log("\n" + "=".repeat(72));
if (problems === 0 && total === 59 && subjects.length === 3) {
  console.log("✓ PARSE OK — 3 subjects, 59 questions, no empty blocks, no duplicates.");
  console.log("  (Strategic's missing Q10 is by design — not flagged.)");
} else {
  console.log(`⚠ ${problems} problem(s) detected above — review before building UI.`);
  process.exitCode = 1;
}
console.log("");
