export const FAMILIES = [
  { id: "settlements", label: "Settlements (JNF focus area)", short: "Settlements" },
  { id: "jnf-sites", label: "JNF Sites", short: "JNF Sites" },
  { id: "general-sites", label: "General Sites", short: "General" },
];

export const FAMILY_IDS = FAMILIES.map((f) => f.id);

export const DEFAULT_FAMILY_MIX = {
  settlements: 50,
  "jnf-sites": 10,
  "general-sites": 40,
};

export function familyLabel(id) {
  return FAMILIES.find((f) => f.id === id)?.short || id || "";
}

export function splitFamilyCounts(total, mix = DEFAULT_FAMILY_MIX) {
  const n = Math.max(1, Math.round(Number(total) || 10));
  const weights = FAMILY_IDS.map((id) => ({
    id,
    weight: Math.max(0, Number(mix?.[id] ?? DEFAULT_FAMILY_MIX[id] ?? 0)),
  }));
  const sum = weights.reduce((s, w) => s + w.weight, 0) || 1;
  const parts = weights.map((w) => {
    const exact = (n * w.weight) / sum;
    return { id: w.id, floor: Math.floor(exact), frac: exact - Math.floor(exact), count: Math.floor(exact) };
  });
  let assigned = parts.reduce((s, p) => s + p.floor, 0);
  parts.sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (assigned < n) {
    parts[i % parts.length].count += 1;
    assigned += 1;
    i += 1;
  }
  return Object.fromEntries(parts.map((p) => [p.id, p.count]));
}
