// One-time (occasional) generator: produces high-quality study material per question — cloze
// blanks (Step 2) and active-recall flashcards (Step 3) — from each question's canonical theory,
// using the Anthropic API. Run once, commit src/data/study.json; the app reads it offline.
//
//   npm run generate-study           (loads .env for ANTHROPIC_API_KEY / ANTHROPIC_MODEL)
//
// Tip: ANTHROPIC_MODEL=claude-opus-4-8 npm run generate-study  → sharper picks for the one-time run.

import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const IN = path.join("src", "data", "questions.json");
const OUT = path.join("src", "data", "study.json");

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is not set. Run via `npm run generate-study` (it loads .env).");
  process.exit(1);
}
const client = new Anthropic({ apiKey });

const SYSTEM = `You create study material for an ORAL state exam (answered in English) from a question's canonical theory. Judge everything by what a student must genuinely RECALL and SAY in the exam: named frameworks/models, key terms, classifications, and the load-bearing words of definitions. Avoid trivia, section labels, and sentence fragments.

Return ONLY JSON (no prose, no code fences):
{
  "blanks": [
    { "clue": "a self-contained sentence with the key term replaced by ____", "answer": "the term", "accept": ["acceptable synonym or spelling", "..."] }
  ],
  "flashcards": [
    { "front": "a SPECIFIC recall prompt stating exactly what to recall", "back": "a concise but COMPLETE answer" }
  ]
}

Rules:
- 6-10 blanks and 5-9 flashcards.
- Each blank's clue contains exactly one ____ and is answerable from understanding the concept (never blank out a section label like "What marketing is").
- Flashcard fronts must be SPECIFIC about what to recall (e.g. "List the 4 Ps of the marketing mix and what each covers"), never just a restatement of the broad question/topic title.
- Flashcard backs must be self-contained and COMPLETE: if the answer is a list, include every item.
- "accept" may be an empty array.`;

const userPrompt = (q) =>
  `QUESTION: ${q.title}\nEXAM AREA: ${q.examArea || "—"}\n\nCANONICAL THEORY:\n---\n${q.theory.raw}\n---`;

function parseJSON(text) {
  const s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

const data = JSON.parse(await readFile(IN, "utf8"));
const out = {};
let totalBlanks = 0;
let totalCards = 0;
let fails = 0;

console.log(`Generating study material with ${MODEL} for ${data.questions.length} questions…\n`);

for (const q of data.questions) {
  process.stdout.write(`  ${q.id} … `);
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(q) }],
    });
    const raw = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const json = parseJSON(raw);
    if (!json || !Array.isArray(json.blanks) || !Array.isArray(json.flashcards)) {
      throw new Error("unexpected shape");
    }
    const blanks = json.blanks
      .filter((b) => b && b.clue && b.answer)
      .map((b) => ({
        clue: String(b.clue),
        answer: String(b.answer),
        accept: Array.isArray(b.accept) ? b.accept.map(String) : [],
      }));
    const flashcards = json.flashcards
      .filter((c) => c && c.front && c.back)
      .map((c) => ({ front: String(c.front), back: String(c.back) }));
    out[q.id] = { blanks, flashcards };
    totalBlanks += blanks.length;
    totalCards += flashcards.length;
    console.log(`${blanks.length} blanks, ${flashcards.length} cards`);
  } catch (e) {
    fails += 1;
    out[q.id] = { blanks: [], flashcards: [] };
    console.log(`FAILED (${e.message})`);
  }
}

await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(
  `\nWrote ${OUT} — ${Object.keys(out).length} questions, ${totalBlanks} blanks, ${totalCards} flashcards${
    fails ? `, ${fails} FAILED (rerun to retry)` : ""
  }.`
);
if (fails) process.exitCode = 1;
