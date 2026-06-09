// AI integration (build spec §5). One module, two modes, both routed through the backend so
// the Anthropic key never reaches the browser. Grade MEANING, not wording.
import Anthropic from "@anthropic-ai/sdk";

// Model is swappable via env (spec §5). Default to Sonnet 4.6 for quality/cost on grading;
// bump ANTHROPIC_MODEL to an Opus model (e.g. claude-opus-4-8) for tougher review.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = 2048;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY is not set in .env");
    err.code = "NO_KEY";
    throw err;
  }
  return new Anthropic({ apiKey });
}

const PROJECTS_NOTE = `The student may give their own real-world practical examples (their projects: Ondruš & Partners / Dubai real-estate advisory, a German-goods e-shop, a dropshipping store, a registered cooperative). Judge any practical example on whether it correctly demonstrates the concept — never against a stored example.`;

// §5.1 examiner mode — multi-turn. Emits a plain-text follow-up OR the final feedback JSON.
function examinerSystem({ title, examArea, theoryRaw }, forceFinal) {
  return `You are an oral state-exam examiner for a Czech business programme (the exam is in English). The student is answering this question:

QUESTION: ${title}
EXAM AREA: ${examArea || "—"}

Here is the canonical theory (your PRIVATE answer key — the student should convey these ideas IN THEIR OWN WORDS; do not require verbatim wording):
---
${theoryRaw}
---

${PROJECTS_NOTE}

Behave like a real commission:
1. Read the student's answer.
2. Ask 1–2 focused follow-up questions to probe understanding. Ask ONE at a time, as plain text (no JSON).
3. After their replies, STOP asking and return the final feedback as JSON ONLY (no prose, no code fences):
{
  "theoryCoverage": { "score": 1-5, "covered": ["..."], "missing": ["..."] },
  "practicalFit": { "score": 1-5, "verdict": "fits|partly|doesn't fit", "note": "..." },
  "clarity": { "score": 1-5, "note": "spoken-delivery feedback" },
  "overall": 1-5,
  "strengths": ["..."],
  "fixes": ["concrete, sayable improvements"],
  "modelMiniAnswer": "2-3 sentence example of a strong spoken answer"
}

Rules: Output EITHER a single follow-up question as plain text, OR the final feedback JSON — never both. Ask at most TWO follow-up questions in total. Grade meaning, not wording. Be encouraging but honest.${
    forceFinal
      ? "\n\nThe student has now answered your follow-ups. STOP asking questions and return ONLY the final feedback JSON now."
      : ""
  }`;
}

// §5.2 practical-fit mode — single turn. Judges the student's OWN example on its own merits.
function practicalFitSystem({ title, examArea, theoryRaw }) {
  return `You evaluate whether a student's practical example correctly demonstrates a theoretical concept for an oral state exam (in English).

QUESTION: ${title}
EXAM AREA: ${examArea || "—"}

Canonical theory (the concept to illustrate):
---
${theoryRaw}
---

${PROJECTS_NOTE}

The student will give their OWN practical example. Judge it ONLY on whether it correctly illustrates the concept — do not compare it to any stored example. Return JSON ONLY (no prose, no code fences):
{
  "practicalFit": { "score": 1-5, "verdict": "fits|partly|doesn't fit", "note": "..." },
  "strengths": ["what's strong about the example"],
  "missing": ["what's missing or misapplied"],
  "sharperVersion": "one sharper version of the example they could say out loud"
}`;
}

function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// Tolerant JSON parse: strip code fences, then fall back to the first {...} block.
function tryParseJSON(text) {
  const stripped = stripFences(text);
  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

// messages: full conversation history [{ role: "user"|"assistant", content: string }].
export async function runExaminer({ mode, question, messages, forceFinal }) {
  const client = getClient();
  const system =
    mode === "practical-fit" ? practicalFitSystem(question) : examinerSystem(question, forceFinal);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages,
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { raw, json: tryParseJSON(raw), model: response.model };
}
