import { exec } from "node:child_process";
import { createServer } from "node:http";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { appRoot, publicBasePath } from "./paths.js";
import express from "express";
import cors from "cors";
import { pickRound, scoreGuess, sanitizeQuestion, timerFor } from "../shared/scoring.js";
import { DEFAULT_FAMILY_MIX, splitFamilyCounts } from "../shared/families.js";
import { APP_VERSION, APP_VERSION_LABEL } from "../shared/version.js";
import { clearPlayers, maybeResetLeaderboard, publicBoard, readStore, toCsv, upsertScore } from "./store.js";
import {
  getConfig,
  getQuestion,
  getQuestions,
  normalizeQuestion,
  saveConfig,
  saveQuestions,
  saveUpload,
} from "./content.js";

const root = appRoot();
const basePath = publicBasePath();
const isDev = process.argv.includes("--dev");
const isDesktop = process.argv.includes("--desktop");
const PORT = Number(process.env.PORT || (isDev ? 3001 : 3000));

const sessions = new Map();
const hits = new Map();

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "12mb" }));

const routes = express.Router();

async function withStore() {
  return maybeResetLeaderboard(getConfig().admin?.leaderboardReset || "never");
}

routes.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "green-horizons", version: APP_VERSION });
});

routes.post("/api/session", (req, res) => {
  if (tooMany(req, "session", 12, 10 * 60 * 1000)) {
    return res.status(429).json({ error: "Please wait before starting another game." });
  }
  const player = normalizePlayer(req.body);
  if (!player) return res.status(400).json({ error: "Invalid player details." });
  try {
    const round = pickRound(getQuestions(), getConfig().game);
    const session = {
      id: randomUUID(),
      player,
      questionIds: round.map((q) => q.id),
      index: 0,
      startedAt: null,
      guesses: [],
      status: "active",
      createdAt: Date.now(),
    };
    sessions.set(session.id, session);
    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

routes.post("/api/next", (req, res) => {
  const session = sessions.get(req.body?.sessionId);
  if (!session || session.status !== "active") {
    return res.status(404).json({ error: "Session not found." });
  }
  if (session.guesses.length > session.index) {
    session.index += 1;
    session.startedAt = null;
  }
  if (session.index >= session.questionIds.length) {
    return res.json({ done: true, total: session.questionIds.length });
  }
  const question = getQuestion(session.questionIds[session.index]);
  if (!question) return res.status(404).json({ error: "Question not found." });
  if (!session.startedAt) session.startedAt = Date.now();
  res.json({
    index: session.index,
    total: session.questionIds.length,
    question: sanitizeQuestion(question),
  });
});

routes.post("/api/guess", (req, res) => {
  if (tooMany(req, "guess", 40, 10 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many guesses. Please slow down." });
  }
  const session = sessions.get(req.body?.sessionId);
  if (!session || session.status !== "active") {
    return res.status(404).json({ error: "Session not found." });
  }
  if (session.guesses.length > session.index) {
    return res.status(400).json({ error: "This question was already answered." });
  }
  const question = getQuestion(session.questionIds[session.index]);
  const durationMs = timerFor(question.difficulty, getConfig().game);
  const elapsedMs = session.startedAt ? Date.now() - session.startedAt : durationMs;
  const timedOut = Boolean(req.body?.timedOut) || elapsedMs >= durationMs;
  const target = { lat: question.latitude, lng: question.longitude };
  let result;
  if (timedOut || !Number.isFinite(req.body?.lat) || !Number.isFinite(req.body?.lng)) {
    result = {
      distanceKm: null,
      distanceScore: 0,
      speedBonus: 0,
      questionScore: 0,
      timedOut: true,
    };
  } else {
    result = scoreGuess({
      guess: { lat: Number(req.body.lat), lng: Number(req.body.lng) },
      target,
      elapsedMs: Math.min(elapsedMs, durationMs),
      durationMs,
      game: getConfig().game,
    });
  }
  const recorded = { ...result, correct: target, id: question.id, name: question.name };
  session.guesses.push(recorded);
  res.json(recorded);
});

routes.post("/api/complete", async (req, res) => {
  const session = sessions.get(req.body?.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
  if (session.guesses.length < session.questionIds.length) {
    return res.status(400).json({ error: "Finish all questions first." });
  }
  session.status = "complete";
  const totalScore = session.guesses.reduce((sum, g) => sum + g.questionScore, 0);
  await withStore();
  const saved = await upsertScore(session.player, totalScore);
  const store = await readStore();
  const sorted = [...store.players].sort((a, b) => b.highScore - a.highScore);
  res.json({
    totalScore,
    breakdown: session.guesses.map((g) => ({
      id: g.id,
      name: g.name,
      distanceKm: g.distanceKm,
      questionScore: g.questionScore,
      timedOut: Boolean(g.timedOut),
    })),
    rank: saved.rank,
    playerCount: sorted.length,
    leaderboard: publicBoard(sorted, getConfig().game.leaderboardTop),
  });
});

routes.post("/api/join", async (req, res) => {
  const player = normalizePlayer({ ...req.body?.player, mode: "registered", consent: true });
  const totalScore = Number(req.body?.totalScore);
  if (!player || !Number.isFinite(totalScore)) {
    return res.status(400).json({ error: "Invalid join request." });
  }
  await withStore();
  const saved = await upsertScore(player, totalScore);
  const store = await readStore();
  const sorted = [...store.players].sort((a, b) => b.highScore - a.highScore);
  res.json({
    totalScore,
    breakdown: req.body.breakdown || [],
    rank: saved.rank,
    playerCount: sorted.length,
    leaderboard: publicBoard(sorted, getConfig().game.leaderboardTop),
  });
});

routes.get("/api/leaderboard", async (req, res) => {
  const limit = Number(req.query.limit) || getConfig().game.leaderboardTop;
  const store = await withStore();
  const sorted = [...store.players].sort((a, b) => b.highScore - a.highScore);
  res.json({
    playerCount: sorted.length,
    leaderboard: publicBoard(sorted, limit),
  });
});

routes.get("/api/admin/players", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  const store = await withStore();
  const players = [...store.players].sort((a, b) => b.highScore - a.highScore);
  res.json({
    players,
    stats: {
      players: players.length,
      plays: players.reduce((sum, p) => sum + p.plays, 0),
      topScore: players[0]?.highScore || 0,
    },
  });
});

routes.get("/api/admin/export", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  const store = await withStore();
  const players = [...store.players].sort((a, b) => b.highScore - a.highScore);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=green-horizons-leaderboard.csv");
  res.send(toCsv(players));
});

routes.delete("/api/admin/players", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  const store = await clearPlayers();
  res.json({
    ok: true,
    players: store.players,
    stats: { players: 0, plays: 0, topScore: 0 },
  });
});

routes.post("/api/admin/players/clear", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  const store = await clearPlayers();
  res.json({
    ok: true,
    players: store.players,
    stats: { players: 0, plays: 0, topScore: 0 },
  });
});

routes.get("/api/admin/content", (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  res.json({ config: getConfig(), questions: getQuestions() });
});

routes.put("/api/admin/config", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  try {
    const next = mergeConfig(getConfig(), req.body || {});
    const saved = await saveConfig(next);
    res.json({ config: saved });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

routes.put("/api/admin/questions", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  try {
    const incoming = Array.isArray(req.body?.questions) ? req.body.questions : req.body;
    if (!Array.isArray(incoming)) throw new Error("Send a list of questions.");
    const ids = new Set();
    const questions = incoming.map((item) => {
      const q = normalizeQuestion(item, ids, item.id);
      ids.add(q.id);
      return q;
    });
    const saved = await saveQuestions(questions);
    res.json({ questions: saved });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

routes.post("/api/admin/questions", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  try {
    const current = getQuestions();
    const ids = new Set(current.map((q) => q.id));
    const question = normalizeQuestion(req.body || {}, ids);
    const saved = await saveQuestions([...current, question]);
    res.json({ question, questions: saved });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

routes.put("/api/admin/questions/:id", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  try {
    const current = getQuestions();
    const index = current.findIndex((q) => q.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: "Question not found." });
    const ids = new Set(current.map((q) => q.id));
    const question = normalizeQuestion(req.body || {}, ids, req.params.id);
    const next = [...current];
    next[index] = question;
    const saved = await saveQuestions(next);
    res.json({ question, questions: saved });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

routes.delete("/api/admin/questions/:id", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  const saved = await saveQuestions(getQuestions().filter((q) => q.id !== req.params.id));
  res.json({ questions: saved });
});

routes.post("/api/admin/upload", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "Invalid admin PIN." });
  try {
    const url = await saveUpload(req.body?.filename || "photo", req.body?.dataUrl);
    res.json({ url });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

if (!isDev) {
  const dist = join(root, "dist");
  routes.use(express.static(dist));
  routes.use(express.static(join(root, "public")));
  routes.get(/^(?!\/api).*/, async (req, res) => {
    const file = req.path.startsWith("/admin") ? "admin.html" : "index.html";
    res.sendFile(join(dist, file), (err) => {
      if (err) res.sendFile(join(root, file));
    });
  });
}

app.use(basePath || "/", routes);

const server = createServer(app);
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Close the other Green Horizons server and try again.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
server.listen(PORT, () => {
  const prefix = basePath || "";
  const gameUrl = `http://127.0.0.1:${PORT}${prefix}/`;
  const adminUrl = `http://127.0.0.1:${PORT}${prefix}/admin.html`;
  console.log(`Green Horizons ${APP_VERSION_LABEL} ${isDev ? "API" : "server"} listening on ${gameUrl}`);
  if (isDesktop) {
    console.log(`Version ${APP_VERSION}`);
    console.log(`Game:  ${gameUrl}`);
    console.log(`Admin: ${adminUrl}`);
    console.log("Close this window to stop.");
    setTimeout(() => {
      openBrowser(gameUrl);
      setTimeout(() => openBrowser(adminUrl), 500);
    }, 400);
  }
});

function openBrowser(url) {
  exec(`cmd /c start "" "${url}"`);
}

function normalizePlayer(body = {}) {
  const name = String(body.name || "").trim();
  if (name.length < 2) return null;
  const mode = body.mode === "guest" ? "guest" : "registered";
  if (mode === "guest") return { mode, name, email: "", phone: "", consent: false };
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  if (!email && !phone) return null;
  if (!body.consent) return null;
  return { mode, name, email, phone, consent: true };
}

function adminOk(req) {
  const pin = req.query.pin || req.headers["x-admin-pin"];
  return pin && pin === getConfig().admin.pin;
}

function mergeConfig(current, patch) {
  const next = structuredClone(current);
  if (patch.brand) Object.assign(next.brand, patch.brand);
  if (patch.game) {
    Object.assign(next.game, patch.game);
    if (patch.game.timerSeconds) {
      Object.assign(next.game.timerSeconds, patch.game.timerSeconds);
    }
    const n = Number(patch.game.questionsPerGame ?? next.game.questionsPerGame ?? 10);
    next.game.questionsPerGame = Math.max(1, Math.round(n));
    const mix = { ...DEFAULT_FAMILY_MIX, ...(next.game.familyMix || {}), ...(patch.game.familyMix || {}) };
    for (const key of Object.keys(mix)) {
      const value = Number(mix[key]);
      mix[key] = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : DEFAULT_FAMILY_MIX[key];
    }
    next.game.familyMix = mix;
    next.game.questionsPerFamily = splitFamilyCounts(next.game.questionsPerGame, mix);
    next.game.requireGuessConfirm = Boolean(
      patch.game.requireGuessConfirm ?? next.game.requireGuessConfirm
    );
  }
  if (patch.map) Object.assign(next.map, patch.map);
  if (patch.admin) Object.assign(next.admin, patch.admin);
  const reset = next.admin.leaderboardReset || "never";
  if (!["never", "daily", "monthly"].includes(reset)) next.admin.leaderboardReset = "never";
  if (next.admin.pin && String(next.admin.pin).trim().length < 4) {
    throw new Error("Admin PIN must be at least 4 characters.");
  }
  return next;
}

function tooMany(req, kind, max, windowMs) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "local";
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

