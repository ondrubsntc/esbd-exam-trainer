import StepTracker from "./StepTracker.jsx";
import Step1Read from "./steps/Step1Read.jsx";
import Step2Blanks from "./steps/Step2Blanks.jsx";
import Step3Flashcards from "./steps/Step3Flashcards.jsx";
import Step4Connector from "./steps/Step4Connector.jsx";
import Step5Examiner from "./steps/Step5Examiner.jsx";
import { useProgress } from "../state/progress.jsx";

export default function QuestionView({ question, step, onStepChange }) {
  const { getRecord } = useProgress();
  const record = getRecord(question.id);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
        {question.subject} · Q{question.number}
      </div>
      <h1 className="text-2xl font-semibold leading-tight text-stone-900">{question.title}</h1>

      {question.examArea && (
        <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm italic text-amber-900">
          <span className="font-semibold not-italic">Exam area: </span>
          {question.examArea}
        </p>
      )}

      <div className="mb-8 mt-6">
        <StepTracker step={step} onStepChange={onStepChange} record={record} />
      </div>

      {/* key forces a fresh mount (resets step-local state) when the question or step changes */}
      <div key={`${question.id}:${step}`}>
        {step === 1 && <Step1Read question={question} />}
        {step === 2 && <Step2Blanks question={question} />}
        {step === 3 && <Step3Flashcards question={question} onAdvance={() => onStepChange(4)} />}
        {step === 4 && <Step4Connector question={question} />}
        {step === 5 && <Step5Examiner question={question} />}
      </div>
    </div>
  );
}
