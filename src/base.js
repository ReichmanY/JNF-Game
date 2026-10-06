export function basePath() {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function withBase(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || String(path).startsWith("data:")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${basePath()}${p}`;
}
