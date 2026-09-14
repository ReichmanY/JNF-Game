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

export function pickRound(questions, game, random = Math.random) {
  const counts = game.questionsPerDifficulty;
  const byDiff = { easy: [], medium: [], hard: [] };
  for (const q of questions) {
    if (byDiff[q.difficulty]) byDiff[q.difficulty].push(q);
  }
  const picked = [];
  for (const [difficulty, count] of Object.entries(counts)) {
    const pool = shuffle([...byDiff[difficulty]], random);
    if (pool.length < count) {
      throw new Error(`Not enough ${difficulty} questions in the bank`);
    }
    picked.push(...pool.slice(0, count));
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
  return (game.timerSeconds[difficulty] ?? game.timerSeconds.medium) * 1000;
}
