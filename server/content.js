import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { appRoot } from "./paths.js";

const root = appRoot();
const configPath = join(root, "public", "config.json");
const questionsPath = join(root, "public", "questions.json");
const uploadsDir = join(root, "public", "uploads");

let config = JSON.parse(await readFile(configPath, "utf8"));
let questionsFile = JSON.parse(await readFile(questionsPath, "utf8"));

export function getConfig() {
  return config;
}

export function getQuestions() {
  return questionsFile.questions;
}

export function getQuestion(id) {
  return questionsFile.questions.find((q) => q.id === id);
}

export async function saveConfig(next) {
  config = next;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return config;
}

export async function saveQuestions(questions) {
  questionsFile = {
    ...questionsFile,
    version: (questionsFile.version || 1) + 1,
    questions,
  };
  await writeFile(questionsPath, `${JSON.stringify(questionsFile, null, 2)}\n`);
  return questionsFile.questions;
}

export function slugify(name) {
  const base = String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `place-${Date.now()}`;
}

export function uniqueId(name, existing, preferred) {
  if (preferred && !existing.has(preferred)) return preferred;
  const base = slugify(name);
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function normalizeQuestion(input, existingIds, previousId = "") {
  const name = String(input.name || "").trim();
  const hint = String(input.hint || input.description || "").trim();
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const difficulty = ["easy", "medium", "hard"].includes(input.difficulty)
    ? input.difficulty
    : "medium";
  if (name.length < 2) throw new Error("Each place needs a name.");
  if (hint.length < 2) throw new Error("Each place needs an English hint.");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Click the map or enter valid latitude and longitude.");
  }
  const others = new Set(existingIds);
  if (previousId) others.delete(previousId);
  return {
    id: uniqueId(name, others, previousId || input.id),
    name,
    hint,
    image_url: String(input.image_url || "").trim(),
    latitude,
    longitude,
    difficulty,
    category: String(input.category || "").trim(),
  };
}

export async function saveUpload(filename, dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Please upload a JPG, PNG, GIF, or WebP photo.");
  const mime = match[1].toLowerCase();
  const allowed = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = allowed[mime];
  if (!ext) throw new Error("Please upload a JPG, PNG, GIF, or WebP photo.");
  const raw = Buffer.from(match[2], "base64");
  if (raw.length > 5 * 1024 * 1024) throw new Error("Photos must be 5 MB or smaller.");
  await mkdir(uploadsDir, { recursive: true });
  const safe = slugify(filename.replace(/\.[^.]+$/, "")) || "photo";
  const stored = `${safe}-${Date.now().toString(36)}.${ext}`;
  await writeFile(join(uploadsDir, stored), raw);
  return `/uploads/${stored}`;
}

export { root };
