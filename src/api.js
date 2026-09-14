const STORAGE_KEY = "gh-leaderboard-v1";

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { players: [] };
  } catch {
    return { players: [] };
  }
}

function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function playerKey(player) {
  if (player.email) return `email:${player.email.trim().toLowerCase()}`;
  if (player.phone) return `phone:${player.phone.replace(/\D/g, "")}`;
  return null;
}

export function createApi() {
  let remote = null;

  async function detect() {
    if (remote !== null) return remote;
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      remote = res.ok;
    } catch {
      remote = false;
    }
    return remote;
  }

  async function startSession(player, questions, game) {
    if (await detect()) {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(player),
      });
      if (!res.ok) throw new Error("Could not start a game session");
      return res.json();
    }
    const { pickRound } = await import("../shared/scoring.js");
    const round = pickRound(questions, game).map((q) => ({ ...q }));
    return { sessionId: `local-${Date.now()}`, local: true, round };
  }

  async function nextQuestion(sessionId) {
    if (await detect()) {
      const res = await fetch("/api/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Could not load the next question");
      return res.json();
    }
    return { local: true };
  }

  async function submitGuess(sessionId, payload) {
    if (await detect()) {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...payload }),
      });
      if (!res.ok) throw new Error("Could not score this guess");
      return res.json();
    }
    return { local: true };
  }

  async function complete(sessionId, fallback) {
    if (await detect()) {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Could not finish the game");
      return res.json();
    }
    return completeLocal(fallback);
  }

  function completeLocal({ player, totalScore, breakdown }) {
    const data = loadLocal();
    let rank = null;
    let saved = false;
    if (player?.mode === "registered" && player.consent) {
      const key = playerKey(player);
      let existing = data.players.find((p) => p.key === key);
      if (!existing) {
        existing = {
          key,
          name: player.name,
          email: player.email || "",
          phone: player.phone || "",
          highScore: totalScore,
          lastScore: totalScore,
          plays: 1,
          updatedAt: new Date().toISOString(),
        };
        data.players.push(existing);
      } else {
        existing.name = player.name;
        existing.lastScore = totalScore;
        existing.plays += 1;
        existing.highScore = Math.max(existing.highScore, totalScore);
        existing.updatedAt = new Date().toISOString();
      }
      saveLocal(data);
      saved = true;
    }
    const sorted = [...data.players].sort((a, b) => b.highScore - a.highScore);
    if (saved) {
      const key = playerKey(player);
      rank = sorted.findIndex((p) => p.key === key) + 1;
    }
    return {
      totalScore,
      breakdown,
      rank,
      playerCount: sorted.length,
      leaderboard: sorted.slice(0, 10).map(({ name, highScore }, i) => ({
        rank: i + 1,
        name,
        score: highScore,
      })),
      local: true,
    };
  }

  async function leaderboard(limit = 10) {
    if (await detect()) {
      const res = await fetch(`/api/leaderboard?limit=${limit}`);
      if (!res.ok) throw new Error("Could not load the leaderboard");
      return res.json();
    }
    const sorted = [...loadLocal().players].sort((a, b) => b.highScore - a.highScore);
    return {
      playerCount: sorted.length,
      leaderboard: sorted.slice(0, limit).map(({ name, highScore }, i) => ({
        rank: i + 1,
        name,
        score: highScore,
      })),
    };
  }

  async function joinLeaderboard(player, totalScore, breakdown) {
    if (await detect()) {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, totalScore, breakdown }),
      });
      if (!res.ok) throw new Error("Could not join the leaderboard");
      return res.json();
    }
    return completeLocal({
      player: { ...player, mode: "registered", consent: true },
      totalScore,
      breakdown,
    });
  }

  return { detect, startSession, nextQuestion, submitGuess, complete, leaderboard, joinLeaderboard, loadLocal };
}

export { playerKey, loadLocal, saveLocal, STORAGE_KEY };
