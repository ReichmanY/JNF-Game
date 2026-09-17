import { distanceKm } from "./geo.js";

export function distanceScore(km, game) {
  const max = game.maxDistanceScore;
  if (km <= game.perfectDistanceKm) return max;
  if (km >= game.zeroScoreDistanceKm) return 0;
  return Math.round(max * Math.exp(-km / game.distanceDecayK));
}

export function speedBonus(elapsedMs, durationMs, game) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0;
  const capped = Math.min(elapsedMs, durationMs);
  const fullUntil = durationMs * game.speedFullBonusRatio;
  if (capped <= fullUntil) return game.maxSpeedBonus;
  const t = (capped - fullUntil) / Math.max(1, durationMs - fullUntil);
  return Math.round(
    game.maxSpeedBonus + (game.minSpeedBonus - game.maxSpeedBonus) * t
  );
}

export function scoreGuess({ guess, target, elapsedMs, durationMs, game }) {
  const km = distanceKm(guess, target);
  const accuracy = distanceScore(km, game);
  const speed = speedBonus(elapsedMs, durationMs, game);
  return {
    distanceKm: km,
    distanceScore: accuracy,
    speedBonus: speed,
    questionScore: accuracy + speed,
  };
}

export function splitDifficulties(total) {
  const n = Math.max(1, Math.round(Number(total) || 10));
  const easy = Math.ceil(n / 3);
  const hard = Math.floor(n / 3);
  const medium = n - easy - hard;
  return { easy, medium, hard, total: n };
}

export function pickRound(questions, game, random = Math.random) {
  const n = Math.max(1, Number(game.questionsPerGame) || 10);
  const counts = splitDifficulties(n);
  const byDiff = { easy: [], medium: [], hard: [] };
  for (const q of questions) {
    if (byDiff[q.difficulty]) byDiff[q.difficulty].push(q);
  }
  const used = new Set();
  const picked = [];
  for (const difficulty of ["easy", "medium", "hard"]) {
    const pool = shuffle(
      byDiff[difficulty].filter((q) => !used.has(q.id)),
      random
    );
    const take = pool.slice(0, counts[difficulty]);
    for (const q of take) used.add(q.id);
    picked.push(...take);
  }
  if (picked.length < n) {
    const rest = shuffle(
      questions.filter((q) => !used.has(q.id)),
      random
    );
    picked.push(...rest.slice(0, n - picked.length));
  }
  if (picked.length < n) {
    throw new Error(`Need at least ${n} questions in the bank`);
  }
  return picked;
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function sanitizeQuestion(question) {
  const { latitude, longitude, ...safe } = question;
  return safe;
}

export function timerFor(difficulty, game) {
  const timers = game.timerSeconds || {};
  const seconds = timers[difficulty] ?? timers.medium ?? timers.easy ?? 30;
  return seconds * 1000;
}
