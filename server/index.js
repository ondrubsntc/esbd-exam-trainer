// Backend for the ESBD study app. Single-user, local.
//  - GET  /api/progress  -> the whole progress map { [questionId]: record }
//  - PUT  /api/progress  -> replace the whole progress map (client holds authoritative state)
//  - POST /api/examiner  -> Anthropic proxy (added in M4)
import express from "express";
import { storage } from "./storage/index.js";
import { runExaminer } from "./examiner.js";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    storage: storage.name,
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    prepTimerSeconds: Number(process.env.PREP_TIMER_SECONDS) || 120,
  })
);

// AI examiner / practical-fit proxy (spec §5). Keeps the Anthropic key server-side.
app.post("/api/examiner", async (req, res) => {
  const { mode, question, messages, forceFinal } = req.body || {};
  if (!question || !question.title || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Body needs { question, messages[] }" });
  }
  try {
    const result = await runExaminer({ mode, question, messages, forceFinal });
    res.json(result);
  } catch (e) {
    if (e.code === "NO_KEY") {
      return res.status(503).json({ error: "AI is not configured — set ANTHROPIC_API_KEY in .env." });
    }
    console.error("POST /api/examiner failed:", e.status || "", e.message);
    const status = typeof e.status === "number" ? e.status : 502;
    res.status(status).json({ error: e.message || "The AI request failed. Please retry." });
  }
});

app.get("/api/progress", async (req, res) => {
  try {
    res.json(await storage.getAll());
  } catch (e) {
    console.error("GET /api/progress failed:", e);
    res.status(500).json({ error: "Failed to read progress" });
  }
});

app.put("/api/progress", async (req, res) => {
  const map = req.body;
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    return res.status(400).json({ error: "Body must be a progress map object" });
  }
  try {
    await storage.saveAll(map);
    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/progress failed:", e);
    res.status(500).json({ error: "Failed to save progress" });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT} (storage: ${storage.name})`);
});
