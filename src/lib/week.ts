import { Place } from "../types";

/**
 * Vráti ISO týždeň v tvare "YYYY-Www" (napr. "2026-W25").
 * ISO 8601: týždeň začína pondelkom, týždeň 1 obsahuje prvý štvrtok roka.
 */
export function getIsoWeek(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // posun na štvrtok aktuálneho týždňa (ISO deň 1..7, Po=1)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Náhodne vyber jeden podnik z poolu (alebo null, ak je prázdny). */
export function pickRandom(pool: Place[]): Place | null {
  if (pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
