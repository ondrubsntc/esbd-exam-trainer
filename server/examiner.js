// AI integration (build spec §5). One module, two modes, both routed through the backend so
// the Anthropic key never reaches the browser. Grade MEANING, not wording.
//
// Reliability: the turns that MUST be JSON (practical-fit, and the examiner's final verdict)
// use structured outputs (output_config.format) so the response is guaranteed valid JSON.
// Free-text examiner follow-ups stay plain text and are parsed leniently.
import Anthropic from "@anthropic-ai/sdk";

// Model is swappable via env (spec §5). Default to Sonnet 4.6 for quality/cost on grading.
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

// ---- structured-output schemas (additionalProperties:false; no min/max/minItems) ----
const SCORE = { type: "integer" };
const STR_ARRAY = { type: "array", items: { type: "string" } };
const FIT = {
  type: "object",
  properties: {
    score: SCORE,
    verdict: { type: "string", enum: ["fits", "partly", "doesn't fit"] },
    note: { type: "string" },
  },
  required: ["score", "verdict", "note"],
  additionalProperties: false,
};

// Examiner final verdict — matches the fields FeedbackCard renders.
const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    theoryCoverage: {
      type: "object",
      properties: { score: SCORE, covered: STR_ARRAY, missing: STR_ARRAY },
      required: ["score", "covered", "missing"],
      additionalProperties: false,
    },
    practicalFit: FIT,
    clarity: {
      type: "object",
      properties: { score: SCORE, note: { type: "string" } },
      required: ["score", "note"],
      additionalProperties: false,
    },
    overall: SCORE,
    strengths: STR_ARRAY,
    fixes: STR_ARRAY,
    modelMiniAnswer: { type: "string" },
  },
  required: ["theoryCoverage", "practicalFit", "clarity", "overall", "strengths", "fixes", "modelMiniAnswer"],
  additionalProperties: false,
};

const PRACTICAL_FIT_SCHEMA = {
  type: "object",
  properties: {
    practicalFit: FIT,
    strengths: STR_ARRAY,
    missing: STR_ARRAY,
    sharperVersion: { type: "string" },
  },
  required: ["practicalFit", "strengths", "missing", "sharperVersion"],
  additionalProperties: false,
};

const PROJECTS_NOTE = `The student may give their own real-world practical examples (their projects: Ondruš & Partners / Dubai real-estate advisory, a German-goods e-shop, a dropshipping store, a registered cooperative). Judge any practical example on whether it correctly demonstrates the concept — never against a stored example.`;

// §5.1 examiner mode — multi-turn. Emits a plain-text follow-up OR (on the final turn) the verdict.
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
2. Ask at most ONE focused follow-up question to probe understanding — plain text, no JSON.
3. After their reply, return the final feedback as JSON.

Grade meaning, not wording. Be encouraging but honest.${
    forceFinal
      ? "\n\nThe student is finished. Do NOT ask another question — return ONLY the final feedback JSON now (theoryCoverage, practicalFit, clarity, overall 1-5, strengths, fixes, modelMiniAnswer)."
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

The student will give their OWN practical example. Judge it ONLY on whether it correctly illustrates the concept — do not compare it to any stored example. Return the structured verdict (practicalFit with score 1-5 and verdict, strengths, missing, and one sharper version they could say out loud).`;
}

function stripFences(text) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

// Pull the first complete {...} object out of text, respecting strings/escapes (robust to prose).
function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function tryParseJSON(text) {
  const stripped = stripFences(text);
  try {
    return JSON.parse(stripped);
  } catch {
    const obj = extractFirstJsonObject(stripped);
    if (obj) {
      try {
        return JSON.parse(obj);
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
  const isPractical = mode === "practical-fit";
  const system = isPractical ? practicalFitSystem(question) : examinerSystem(question, forceFinal);

  const params = { model: MODEL, max_tokens: MAX_TOKENS, system, messages };
  // Guarantee valid JSON whenever the response must be a structured verdict.
  if (isPractical) {
    params.output_config = { format: { type: "json_schema", schema: PRACTICAL_FIT_SCHEMA } };
  } else if (forceFinal) {
    params.output_config = { format: { type: "json_schema", schema: FEEDBACK_SCHEMA } };
  }

  const response = await client.messages.create(params);
  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { raw, json: tryParseJSON(raw), model: response.model };
}
