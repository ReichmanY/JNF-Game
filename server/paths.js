import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function appRoot() {
  if (process.env.GH_ROOT) return process.env.GH_ROOT;
  if (process.argv.includes("--desktop") || process.env.GH_DESKTOP === "1") {
    return process.cwd();
  }
  const here = dirname(fileURLToPath(import.meta.url));
  if (existsSync(join(here, "public", "config.json"))) return here;
  return join(here, "..");
}

/** Public URL prefix. Empty for site root, "/game" for https://example.org/game/. */
export function publicBasePath() {
  const raw = String(process.env.BASE_PATH || "").trim();
  if (!raw || raw === "/") return "";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, "");
}
