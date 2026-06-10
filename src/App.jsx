import { useMemo, useState } from "react";
import data from "./data/questions.json";
import Sidebar from "./components/Sidebar.jsx";
import QuestionView from "./components/QuestionView.jsx";
import QueueHome from "./components/QueueHome.jsx";
import CommissionMode from "./components/CommissionMode.jsx";
import ReadinessDashboard from "./components/ReadinessDashboard.jsx";
import StudyPlan from "./components/StudyPlan.jsx";
import { useProgress } from "./state/progress.jsx";

export default function App() {
  const { subjects, questions } = data;
  const { loaded, saveError } = useProgress();
  const [view, setView] = useState("home"); // home | question | commission | dashboard
  const [selectedId, setSelectedId] = useState(null);
  const [step, setStep] = useState(1);

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId) ?? null,
    [questions, selectedId]
  );

  function openQuestion(id, atStep = 1) {
    setSelectedId(id);
    setStep(atStep);
    setView("question");
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-stone-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-stone-300" />
        <span className="ml-2">Loading your progress…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar
        subjects={subjects}
        questions={questions}
        view={view}
        selectedId={selectedId}
        onNavigate={setView}
        onSelect={(id) => openQuestion(id, 1)}
      />
      <main className="flex-1 overflow-y-auto">
        {view === "home" && (
          <QueueHome questions={questions} onOpen={openQuestion} onCommission={() => setView("commission")} />
        )}
        {view === "plan" && <StudyPlan questions={questions} onOpen={openQuestion} />}
        {view === "commission" && <CommissionMode questions={questions} subjects={subjects} />}
        {view === "dashboard" && <ReadinessDashboard questions={questions} subjects={subjects} />}
        {view === "question" &&
          (selected ? (
            <QuestionView question={selected} step={step} onStepChange={setStep} />
          ) : (
            <div className="p-10 text-stone-500">Select a question to begin.</div>
          ))}
      </main>

      {saveError && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          ⚠ Couldn't save progress — is the backend running? Retrying on your next change.
        </div>
      )}
    </div>
  );
}
