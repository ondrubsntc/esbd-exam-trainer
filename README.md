# ESBD Exam Trainer

A single-user, **local** study app that takes you from zero to a fluent **spoken** answer for
the oral ESBD state exams (in English). It uses active recall, scaffolding, spaced repetition
(Leitner), and an AI oral examiner. Built per `ESBD_Study_App_BUILD_SPEC.md`.

Each person runs their own copy, so **everyone has their own progress automatically** — your
`server/progress.json` is local to your machine and is never shared.

## Quick start

Needs **Node 20.6+** ([nodejs.org](https://nodejs.org)) and your own **Anthropic API key**
([console.anthropic.com](https://console.anthropic.com) → API keys; needed for Steps 4 & 5).

```bash
git clone <repo-url>
cd <folder>
npm install
cp .env.example .env          # then paste your own ANTHROPIC_API_KEY into .env
npm run dev                   # web on http://localhost:5173, API on http://localhost:8787
```

Open **http://localhost:5173**. The app launches on the **Today** queue.

> The question data (`src/data/questions.json`) and the AI-generated study material
> (`src/data/study.json` — the Step 2 blanks and Step 3 flashcards) are already included, so
> there's no build step. Regenerate only if you change the source material:
> `npm run parse` (re-parses `src/data/source.md`) and `npm run generate-study` (re-generates
> blanks + flashcards via the Anthropic API; uses your key, run occasionally).
> `npm run convert` regenerates `source.md` from the original Word doc and is rarely needed.

## How it works

**Per question — 5 steps** (jump to any via the tracker):
1. **Read** — theory then practical, revealed one chunk at a time. Optional "Attempt first" brain-dump.
2. **Blanks** *(optional)* — type the missing key terms; loose spelling is accepted.
3. **Flashcards** — self-rate Again / Hard / Good / Easy. Feeds the Leitner box.
4. **Connect** — write your *own* practical example; the AI judges whether it fits the concept.
5. **Examiner** — deliver your spoken answer (mic or paste/type). The AI asks 1–2 follow-ups,
   then scores you; the score moves the Leitner box.

**Modes** (left nav):
- **Today** — due reviews (interleaved across subjects) + new questions.
- **Commission mode** — random question, optional prep timer, straight to the examiner.
- **Readiness** — per subject: % of questions at box ≥ 3 and average examiner score.

## Spaced repetition (Leitner)

Box 1→5 maps to review intervals of 1 / 2 / 4 / 8 / 16 days. Flashcards: Again→box 1, Hard→stay,
Good→+1, Easy→+2 (a deck applies one transition, using its weakest rating). Examiner: ≥4→+1,
3→stay, ≤2→box 1. Logic lives in `src/lib/leitner.js`.

## Config (`.env`)

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required for Steps 4 & 5. Stays server-side, never sent to the browser. |
| `ANTHROPIC_MODEL` | Default `claude-sonnet-4-6`. Bump to `claude-opus-4-8` for tougher review. |
| `PORT` | Backend port (default 8787). |
| `PREP_TIMER_SECONDS` | Commission-mode prep timer (default 120). |

## Data & persistence

- Questions: `src/data/questions.json` (generated). Subjects: Strategic (19 — no Q10 by design),
  Management (20), Entrepreneurship (20) = **59**.
- Progress: `server/progress.json` (gitignored). The frontend holds the authoritative progress
  map and saves it through `PUT /api/progress`. Storage sits behind a small interface
  (`server/storage/`) so it can be swapped for **Supabase** later without touching the app.

## Notes

- **Microphone** (Step 5 / Commission) uses the Web Speech API — best in **Chrome/Edge**. If
  unsupported, dictate with macOS dictation and paste, or type. The transcript is always editable.
- Stack: React + Vite + Tailwind v4 (frontend), Node + Express (backend), Anthropic API proxy.
