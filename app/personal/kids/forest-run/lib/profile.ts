import type { Difficulty, Mode } from "./game";

export const PROFILE_KEY = "bradley-forest-profile-v2";
export const LEGACY_BEST_KEY = "forest-run-best";
export interface Profile {
  bestDistance: number;
  bestScore: number;
  bestRunStars: number;
  bestCombo: number;
  totalStars: number;
  runs: number;
  trailWins: number;
  muted: boolean;
  mode: Mode;
  difficulty: Difficulty;
}
export const DEFAULT_PROFILE: Profile = Object.freeze({
  bestDistance: 0, bestScore: 0, bestRunStars: 0, bestCombo: 0,
  totalStars: 0, runs: 0, trailWins: 0, muted: false,
  mode: "trail", difficulty: "explorer",
});
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function parseProfile(raw: string | null, legacyBest: string | null = null): Profile {
  let saved: Record<string, unknown> = {};
  try {
    const value: unknown = JSON.parse(raw || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) saved = value as Record<string, unknown>;
  } catch {}
  return {
    bestDistance: count(saved.bestDistance),
    // The original "metres" score included coin bonuses, so preserve it as a score.
    bestScore: Math.max(count(saved.bestScore), count(Number(legacyBest))),
    bestRunStars: count(saved.bestRunStars), bestCombo: count(saved.bestCombo),
    totalStars: count(saved.totalStars), runs: count(saved.runs), trailWins: count(saved.trailWins),
    muted: saved.muted === true,
    mode: saved.mode === "endless" ? "endless" : "trail",
    difficulty: saved.difficulty === "ranger" ? "ranger" : "explorer",
  };
}
