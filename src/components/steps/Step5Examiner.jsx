import { useRef, useState } from "react";
import { callExaminer } from "../../lib/api.js";
import { useDictation } from "../../lib/useDictation.js";
import { useProgress } from "../../state/progress.jsx";
import { BOX_INTERVALS_DAYS } from "../../lib/leitner.js";
import FeedbackCard from "../FeedbackCard.jsx";

const clampScore = (n) => Math.max(1, Math.min(5, Math.round(Number(n) || 0)));

// An editable transcript box with optional live mic dictation (Web Speech API).
function DictationBox({ value, onChange, placeholder, rows = 5 }) {
  const { supported, listening, start, stop } = useDictation((text) =>
    onChange((prev) => (prev ? `${prev} ${text}` : text))
  );
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-stone-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
      />
      <div className="mt-2 flex items-center gap-2">
        {supported && (
          <button
            type="button"
            onClick={listening ? stop : start}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              listening ? "bg-red-500 text-white hover:bg-red-600" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${listening ? "animate-pulse bg-white" : "bg-red-500"}`} />
            {listening ? "Stop mic" : "Speak (mic)"}
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-sm font-medium text-stone-400 hover:text-stone-600"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-stone-400">
        {supported
          ? "Speak in English or type/paste. The transcript is editable — fix any misheard words before submitting."
          : "Mic isn't supported in this browser — dictate with macOS dictation and paste, or type."}
      </p>
    </div>
  );
}

export default function Step5Examiner({ question }) {
  const { getRecord, applyExaminer } = useProgress();
  const priorBox = useRef(getRecord(question.id)?.box ?? 1);

  const [phase, setPhase] = useState("compose"); // compose | thinking | followup | done | error
  const [answer, setAnswer] = useState("");
  const [conversation, setConversation] = useState([]);
  const [examinerQuestion, setExaminerQuestion] = useState("");
  const [followups, setFollowups] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");

  async function send(convo, forceFinal) {
    setPhase("thinking");
    setError("");
    try {
      const result = await callExaminer({ mode: "examiner", question, messages: convo, forceFinal });
      if (result.json && result.json.overall != null) {
        setFeedback(result.json);
        applyExaminer(question.id, clampScore(result.json.overall));
        setPhase("done");
      } else {
        setConversation([...convo, { role: "assistant", content: result.raw }]);
        setExaminerQuestion(result.raw);
        setFollowups((c) => c + 1);
        setAnswer("");
        setPhase("followup");
      }
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  }

  function submitAnswer() {
    if (!answer.trim()) return;
    const convo = [{ role: "user", content: answer.trim() }];
    setConversation(convo);
    send(convo, false);
  }

  function sendReply() {
    if (!answer.trim()) return;
    const convo = [...conversation, { role: "user", content: answer.trim() }];
    setConversation(convo);
    send(convo, followups >= 2); // after 2 follow-ups, force the final verdict
  }

  function restart() {
    priorBox.current = getRecord(question.id)?.box ?? 1;
    setPhase("compose");
    setAnswer("");
    setConversation([]);
    setExaminerQuestion("");
    setFollowups(0);
    setFeedback(null);
    setError("");
  }

  if (phase === "done" && feedback) {
    const rec = getRecord(question.id);
    const nextBox = rec?.box ?? priorBox.current;
    const boxInfo = {
      prior: priorBox.current,
      next: nextBox,
      days: BOX_INTERVALS_DAYS[nextBox],
      dueText: rec?.due ? new Date(rec.due).toLocaleDateString() : "—",
    };
    return (
      <div>
        <FeedbackCard feedback={feedback} boxInfo={boxInfo} />
        <button
          onClick={restart}
          className="mt-4 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          Answer again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Deliver your full spoken answer as you would to the commission. The examiner will ask 1–2 follow-ups, then score you.
      </p>

      {/* Conversation so far */}
      {conversation.length > 0 && (
        <div className="space-y-3">
          {conversation.map((m, i) => (
            <div key={i} className={m.role === "assistant" ? "rounded-lg bg-amber-50 p-3" : "rounded-lg bg-stone-50 p-3"}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                {m.role === "assistant" ? "Examiner" : "You"}
              </div>
              <p className="whitespace-pre-wrap text-sm text-stone-700">{m.content}</p>
            </div>
          ))}
        </div>
      )}

      {phase === "thinking" && (
        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-stone-400" />
          The examiner is considering your answer…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => (conversation.length ? send(conversation, followups >= 2) : setPhase("compose"))}
            className="ml-2 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {(phase === "compose" || phase === "followup" || phase === "error") && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          {phase === "followup" && examinerQuestion && (
            <p className="mb-3 text-sm font-medium text-stone-700">Your reply to the examiner:</p>
          )}
          <DictationBox
            value={answer}
            onChange={setAnswer}
            rows={phase === "compose" ? 7 : 4}
            placeholder={phase === "compose" ? "Deliver your full answer…" : "Reply to the follow-up…"}
          />
          <button
            onClick={phase === "compose" ? submitAnswer : sendReply}
            disabled={!answer.trim()}
            className="mt-3 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === "compose" ? "Submit answer →" : "Send reply →"}
          </button>
        </div>
      )}
    </div>
  );
}
