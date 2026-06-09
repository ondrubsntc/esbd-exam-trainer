// Calls the backend AI proxy (spec §5). Never talks to Anthropic directly — the key is
// server-side only. Returns { raw, json, model }.
export async function callExaminer({ mode, question, messages, forceFinal }) {
  const res = await fetch("/api/examiner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      question: { title: question.title, examArea: question.examArea, theoryRaw: question.theory.raw },
      messages,
      forceFinal,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }
  return res.json();
}
