import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { applyExaminerScore, applyFlashcardRating, averageRating, createRecord } from "../lib/leitner.js";

// Single source of truth for per-question progress. Loads from the backend once, keeps the
// authoritative map in memory, and debounce-saves the whole map back on every change.
const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [records, setRecords] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const dirty = useRef(false); // became true after the first local edit
  const unsaved = useRef(false); // a change is pending or in-flight
  const latestMap = useRef(null); // newest map (for the pagehide flush)
  const saveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/progress")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!alive) return;
        // Don't clobber edits the user made while the initial GET was in flight.
        if (!dirty.current) setRecords(data && typeof data === "object" ? data : {});
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  function persist(map) {
    return fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(map),
    }).then((r) => {
      if (!r.ok) throw new Error(`save failed (${r.status})`);
      if (latestMap.current === map) unsaved.current = false;
      setSaveError(false);
    });
  }

  const scheduleSave = useCallback((map) => {
    latestMap.current = map;
    unsaved.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist(map).catch((e) => {
        console.error("Progress save failed:", e);
        setSaveError(true);
      });
    }, 400);
  }, []);

  // Flush a pending save synchronously when the tab is closing/hidden (keepalive survives unload).
  useEffect(() => {
    const flush = () => {
      if (unsaved.current && latestMap.current) {
        try {
          fetch("/api/progress", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(latestMap.current),
            keepalive: true,
          });
        } catch {
          /* best effort */
        }
      }
    };
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const update = useCallback(
    (questionId, updater) => {
      setRecords((prev) => {
        const current = prev[questionId] ?? createRecord(questionId);
        const next = updater(current);
        if (next === current) return prev; // idempotent no-op → don't re-save
        dirty.current = true;
        const map = { ...prev, [questionId]: next };
        scheduleSave(map);
        return map;
      });
    },
    [scheduleSave]
  );

  const value = {
    records,
    loaded,
    saveError,
    getRecord: (id) => records[id] ?? null,
    markStep: (id, stepKey) =>
      update(id, (r) => (r.steps[stepKey] ? r : { ...r, steps: { ...r.steps, [stepKey]: true } })),
    rateFlashcards: (id, ratings) =>
      update(id, (r) => {
        const rated = applyFlashcardRating(r, averageRating(ratings));
        return { ...rated, steps: { ...rated.steps, flashcard: true } };
      }),
    applyExaminer: (id, score, feedback) =>
      update(id, (r) => {
        const graded = applyExaminerScore(r, score); // sets box, due, lastExaminerScore
        return {
          ...graded,
          lastExaminerFeedback: feedback ?? r.lastExaminerFeedback ?? null,
          lastExaminerAt: new Date().toISOString(),
          steps: { ...graded.steps, examiner: true },
        };
      }),
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within <ProgressProvider>");
  return ctx;
}
