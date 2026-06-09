# ESBD State-Exam Study App — Build Spec for Claude Code

## 0. Role & goal
You are a senior full-stack engineer building a **single-user, local web app** that
takes the user (David) from zero knowledge to a fluent spoken exam answer for his
ESBD state exams (SZZ). The exam is **oral, in English, in front of a commission**.
The app must make studying time-efficient using evidence-based methods:
**active recall, scaffolding (gradually removing support), spaced repetition, and
oral exam simulation.**

Priorities, in order:
1. Ship a usable MVP fast (one subject working end-to-end) before polishing.
2. The two highest-value features are the **AI oral examiner** (Step 5) and
   **spaced repetition** (Leitner). Get these right.
3. Keep it lean. No gamification, no auth, no multiplayer, no diagrams.

Build incrementally and confirm each milestone (see §9) before moving on.

---

## 1. Source data
The source is a single text file (despite the `.docx` extension it is **plain
UTF-8 markdown** — do not try to unzip it; read it as text).

Structure is consistent and parseable:
- `# ESBD State Exam — <Subject Name>` → a **subject** (3 of them).
- `## Q<number> — <title>` → a **question**.
- An optional *italic* line directly under the question header = the official
  exam-area description ("okruh"). Store it as `examArea`.
- `### THEORY` → start of theory; everything until `### PRACTICAL APPLICATION`.
- `### PRACTICAL APPLICATION` → practical; everything until the next `## Q` or `# `.
- Inside sections: `**bold**` labels, `- ` bullets, `*italic*`. Some questions
  have extra sub-headers like `### Purchasing` inside a section — keep them as
  part of the section body.

**Known facts (verify at parse time, do not hardcode blindly):**
- 3 subjects, **59 questions total**.
- Subject 1 "Strategic Development of a Small Company": Q1–Q9 and **Q11–Q20**
  = **19 questions, which is correct and complete**. Q10 does not exist in this
  exam (confirmed) — treat the numbering gap as expected. Do NOT flag it as
  missing, do not warn about it, and do not renumber to close the gap.
- Subjects 2 & 3: Q1–Q20 each.
- Lines `## Questions 1–20 — Study Material` are section dividers, NOT questions
  (they start with "Q" but are not `## Q<number> —`). Match questions strictly
  with a regex like `^## Q(\d+)\s+—\s+(.+)$`.

### 1.1 Parse step
Write `scripts/parse.mjs` that reads the source file and emits
`src/data/questions.json`. Print a summary (subjects found, question count per
subject, any question whose THEORY or PRACTICAL block is empty) so we can verify
the parse before trusting it.

### 1.2 JSON schema (per question)
```jsonc
{
  "id": "strategic-q1",                 // `${subjectId}-q${number}`
  "subjectId": "strategic",             // slug: strategic | management | entrepreneurship
  "subject": "Strategic Development of a Small Company",
  "number": 1,
  "title": "Marketing and its role in a small company; ...",
  "examArea": "…official okruh description, or null…",
  "theory": {
    "raw": "full theory markdown (the canonical answer key — used for grading)",
    "chunks": ["logical paragraph 1", "logical paragraph 2", "..."],
    "keyTerms": ["marketing mix", "4P", "operational level", "..."]
  },
  "practical": {
    "raw": "full practical markdown (a SEED example only — NOT a grading key)",
    "chunks": ["...", "..."]
  }
}
```
- `chunks`: split each section into logical units (by blank line / bold-label
  block / top-level bullet group) so Step 1 can reveal them one at a time.
- `keyTerms`: collect the distinct `**bold**` spans inside theory. These are the
  blank candidates for the optional fill-in-the-blanks step.
- `theory.raw` is the **ground truth** for grading. `practical.raw` is only
  inspiration — never grade the user's practical answer by comparing to it.

---

## 2. Learning workflow (per question)
Each question moves through 5 steps. Steps 1–5 progressively remove support
(scaffolding). The user can also jump straight to any step (esp. Step 5).

**Step 1 — Deconstruction (chunked reading).**
Reveal theory then practical one `chunk` at a time ("Next" button). Optional
toggle **"Attempt first"**: before revealing, show only the question title and a
text box prompting a brain-dump of what they already know (generation effect),
then reveal.

**Step 2 — Fill-in-the-blanks (OPTIONAL, off by default).**
Same theory text with `keyTerms` blanked out; user types the idea. Accept loose
matches (case-insensitive, fuzzy) — the goal is recalling the concept, not exact
spelling. Keep this lightweight.

**Step 3 — Flashcards (active recall).**
Front = question title (and optionally a sub-prompt per chunk); back = the theory
chunk / key idea. User self-rates: *Again / Hard / Good / Easy*. This rating feeds
the Leitner box (§4).

**Step 4 — Connector (Theory ↔ Practice).**
Show the theoretical concept; user writes **their own** practical example (it may
differ from the seed in the materials). Send to the AI evaluator (§5) in
**"practical-fit"** mode: judge whether the example *correctly demonstrates the
concept*, independent of the seed example. Return: fits? / what's strong / what's
missing or misapplied / a sharper version they could say out loud.

**Step 5 — Oral examiner (the core).**
User delivers a full spoken answer. Input options:
- **(a)** Live mic via the browser **Web Speech API** (`SpeechRecognition`,
  `lang="en-US"`), transcript shown live and editable.
- **(b)** **Paste text** — for users who dictate with macOS built-in dictation
  and paste the result, or who just type.
Then the AI plays an examiner (§5, "examiner" mode): it reads the answer, asks
**1–2 follow-up questions** (as a real commission would), waits for the reply,
then returns structured feedback + a 1–5 score. This is a short multi-turn
conversation, not a single grade.

---

## 3. Cross-cutting modes
- **Today / Due queue (home screen):** shows questions due for review per the
  Leitner schedule (§4), plus "new" questions not yet started. This is the
  default landing view — the user follows the queue rather than grinding linearly.
- **Commission mode (exam simulation):** pick a subject (or "all"). App draws a
  **random** question, optionally starts a **2-minute prep timer** (configurable),
  then goes straight to Step 5 with the examiner. After feedback, draw the next.
  This trains real exam conditions.
- **Review = interleaved:** when serving the due queue, mix questions across
  subjects rather than blocking by subject (interleaving aids retention).
- **Readiness dashboard:** per subject, show % of questions in box ≥ 3 and average
  last examiner score, so the user sees where to focus.

---

## 4. Spaced repetition — Leitner box
Each question has a `box` (1–5). Review schedule (configurable constants):
- box 1 → due again next day
- box 2 → +2 days
- box 3 → +4 days
- box 4 → +8 days
- box 5 → +16 days

Box transitions:
- Flashcard self-rating: *Again* → box 1; *Hard* → stay; *Good* → +1; *Easy* → +2.
- Examiner score (§5): score ≥ 4 → +1 box; score = 3 → stay; score ≤ 2 → box 1.
- `due` date recomputed on every transition from the box interval above.

Keep the algorithm in one small, well-named module so it is easy to tweak.

---

## 5. AI integration (examiner + evaluator)
All Anthropic API calls go through the backend (§6) so the API key never reaches
the browser. One endpoint, two modes.

**Model:** read from env `ANTHROPIC_MODEL` (default `claude-sonnet-4-6` — good
quality/cost for grading; can be bumped to an Opus model for tougher review).
Make it swappable; do not hardcode a model string in app logic.

**Grading principle (applies to both modes): grade MEANING, never wording.**
- Theory: the model is given `theory.raw` as the answer key. It checks whether the
  user covered the key ideas **in their own words**. Verbatim match is not
  required and not rewarded.
- Practical: the model is given the question + theory concept, and the user's
  **own** example. It judges whether the example correctly illustrates the
  concept **on its own merits** — it must NOT compare against `practical.raw`.

### 5.1 "examiner" mode (Step 5 & Commission mode) — multi-turn
System prompt template:
```
You are an oral state-exam examiner for a Czech business programme (exam in
English). The student is answering this question:

QUESTION: {title}
EXAM AREA: {examArea}

Here is the canonical theory (your private answer key — the student should
convey these ideas IN THEIR OWN WORDS; do not require verbatim wording):
---
{theory.raw}
---

The student may give their own real-world practical examples (their projects:
Ondruš & Partners / Dubai real-estate advisory, a German-goods e-shop, a
dropshipping store, a registered cooperative). Judge any practical example on
whether it correctly demonstrates the concept — not against any stored example.

Behave like a real commission:
1. Read the student's answer.
2. Ask 1–2 focused follow-up questions to probe understanding. Ask ONE at a time.
3. After their replies, STOP asking and return final feedback as JSON only:
{
  "theoryCoverage": { "score": 1-5, "covered": [...], "missing": [...] },
  "practicalFit": { "score": 1-5, "verdict": "fits|partly|doesn't fit", "note": "..." },
  "clarity": { "score": 1-5, "note": "spoken-delivery feedback" },
  "overall": 1-5,
  "strengths": ["..."],
  "fixes": ["concrete, sayable improvements"],
  "modelMiniAnswer": "2-3 sentence example of a strong spoken answer"
}
Keep follow-up questions short and exam-like. Be encouraging but honest.
```
Frontend manages the short conversation: send answer → render follow-up → send
reply → on the final JSON turn, render the feedback card and feed `overall` into
the Leitner box (§4).

### 5.2 "practical-fit" mode (Step 4) — single turn
Send question + `theory.raw` + the user's example; instruct the model to return
only the `practicalFit` JSON object plus a one-line "sharper version you could say."

### 5.3 Robustness
- Instruct the model to return **only JSON** for the final/grading turns; strip
  ``` fences before `JSON.parse`; wrap in try/catch and show a graceful retry.
- Always send full conversation history on each turn (the API is stateless).
- Show a clear error + retry if the key is missing or the call fails.

---

## 6. Architecture & stack
Keep it minimal and runnable locally on macOS with `npm run dev`.

- **Frontend:** React + Vite + Tailwind. Left sidebar = subjects → questions
  (with box level + step progress badges). Main pane switches by current step/mode.
- **Backend:** Node + Express (or a Vite dev middleware), endpoints:
  - `POST /api/examiner` → proxies Anthropic Messages API (modes from §5).
  - `GET/PUT /api/progress` → load/save progress.
- **Anthropic API:** standard `/v1/messages`. Key from `.env`
  (`ANTHROPIC_API_KEY`), never sent to the client. Provide `.env.example`.
- **Persistence:** single-user local. Use a local **SQLite** file
  (`better-sqlite3`) or a `progress.json` on the backend — pick the simpler one
  that reliably survives restarts. (Browser `localStorage` is acceptable as a
  fallback but a backend file is preferred since the API key already requires a
  backend.)

### Progress record (per question)
```jsonc
{
  "questionId": "strategic-q1",
  "box": 2,
  "due": "2026-06-10T00:00:00Z",
  "steps": { "read": true, "blanks": false, "flashcard": true, "connect": true, "examiner": false },
  "lastExaminerScore": 4,
  "lastConfidence": "good",
  "history": [ { "ts": "...", "event": "examiner", "score": 4 } ]
}
```

---

## 7. UI/UX notes
- Default landing = **Today / Due queue**, not the full question list.
- Per question, show a 5-dot step tracker; let the user jump to any step.
- Step 5 transcript box must be editable (Web Speech API misrecognises non-native
  English; let the user fix before submitting).
- Feedback cards: lead with the score and the 2–3 concrete `fixes`; keep it scannable.
- Keep typography calm and readable; this is a study tool used for long sessions.

---

## 8. Config (env)
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
PORT=8787
PREP_TIMER_SECONDS=120
```

---

## 9. Milestones (confirm each before continuing)
1. **Parse:** `scripts/parse.mjs` produces `questions.json`; print the verification
   summary (3 subjects, 59 questions total — Subject 1 has 19 by design, no Q10;
   no empty THEORY/PRACTICAL blocks).
2. **Skeleton:** React app, sidebar + main pane, loads questions.json, Step 1
   (chunked reading) working for one question.
3. **Recall steps:** Step 2 (optional blanks) + Step 3 (flashcards) + Leitner box
   wired to self-ratings; progress persists.
4. **AI examiner:** backend proxy + Step 5 multi-turn examiner + Step 4
   practical-fit; scores feed the Leitner box.
5. **Modes:** Today/Due queue, Commission mode (random draw + prep timer),
   readiness dashboard.
6. **Polish:** error handling, transcript editing, scannable feedback cards.

Start with milestone 1 and show me the parse summary before building UI.
