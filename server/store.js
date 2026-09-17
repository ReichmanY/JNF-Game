import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { appRoot } from "./paths.js";

const root = appRoot();
const file = join(root, "data", "store.json");

const empty = { players: [], lastResetAt: null };

export async function readStore() {
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.players)) data.players = [];
    return data;
  } catch {
    return { ...empty, players: [] };
  }
}

export async function writeStore(data) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

export async function maybeResetLeaderboard(policy = "never") {
  const data = await readStore();
  if (policy === "never" || !policy) return data;
  const now = new Date();
  const last = data.lastResetAt ? new Date(data.lastResetAt) : null;
  if (!last) {
    data.lastResetAt = now.toISOString();
    await writeStore(data);
    return data;
  }
  const due =
    (policy === "daily" && last.toDateString() !== now.toDateString()) ||
    (policy === "monthly" &&
      (last.getUTCFullYear() !== now.getUTCFullYear() || last.getUTCMonth() !== now.getUTCMonth()));
  if (!due) return data;
  data.players = [];
  data.lastResetAt = now.toISOString();
  await writeStore(data);
  return data;
}

export async function clearPlayers() {
  const data = await readStore();
  data.players = [];
  data.lastResetAt = new Date().toISOString();
  await writeStore(data);
  return data;
}
export function identityKey(player) {
  if (player.email) return `email:${player.email.trim().toLowerCase()}`;
  if (player.phone) return `phone:${String(player.phone).replace(/\D/g, "")}`;
  return null;
}

export async function upsertScore(player, totalScore) {
  if (player.mode !== "registered" || !player.consent) {
    return { saved: false, rank: null, playerCount: (await readStore()).players.length };
  }
  const key = identityKey(player);
  if (!key) return { saved: false, rank: null, playerCount: 0 };

  const data = await readStore();
  let existing = data.players.find((p) => p.key === key);
  const now = new Date().toISOString();
  if (!existing) {
    existing = {
      key,
      name: player.name,
      email: player.email || "",
      phone: player.phone || "",
      highScore: totalScore,
      lastScore: totalScore,
      plays: 1,
      createdAt: now,
      updatedAt: now,
    };
    data.players.push(existing);
  } else {
    existing.name = player.name;
    existing.email = player.email || existing.email;
    existing.phone = player.phone || existing.phone;
    existing.lastScore = totalScore;
    existing.plays += 1;
    existing.highScore = Math.max(existing.highScore, totalScore);
    existing.updatedAt = now;
  }
  await writeStore(data);
  const sorted = [...data.players].sort((a, b) => b.highScore - a.highScore);
  return {
    saved: true,
    rank: sorted.findIndex((p) => p.key === key) + 1,
    playerCount: sorted.length,
    leaderboard: publicBoard(sorted, 10),
  };
}

export function publicBoard(players, limit) {
  return players.slice(0, limit).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    score: p.highScore,
  }));
}

export function toCsv(players) {
  const header = ["name", "email", "phone", "highScore", "lastScore", "plays", "updatedAt"];
  const lines = [header.join(",")];
  for (const p of players) {
    lines.push(
      header
        .map((key) => `"${String(p[key] ?? "").replaceAll('"', '""')}"`)
        .join(",")
    );
  }
  return lines.join("\n");
}
