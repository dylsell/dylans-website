export const PROFILE_KEY = "bradley-space-rescue-v1";

export interface Profile {
  bestScore: number;
  totalRescues: number;
  missions: number;
  victories: number;
  furthestLevel: number;
  muted: boolean;
  difficulty: "cadet" | "ace";
}

export const DEFAULT_PROFILE: Profile = Object.freeze({
  bestScore: 0,
  totalRescues: 0,
  missions: 0,
  victories: 0,
  furthestLevel: 0,
  muted: false,
  difficulty: "cadet",
});

function counter(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum
    ? value === 0 ? 0 : value
    : 0;
}

/** Recover valid fields independently. Invalid level indices (outside 0–3) reset to zero. */
export function parseProfile(raw: string | null): Profile {
  let saved: unknown;
  try {
    saved = raw === null ? null : JSON.parse(raw);
  } catch {
    return { ...DEFAULT_PROFILE };
  }
  if (saved === null || typeof saved !== "object" || Array.isArray(saved)) {
    return { ...DEFAULT_PROFILE };
  }
  const value = saved as Record<string, unknown>;
  return {
    bestScore: counter(value.bestScore),
    totalRescues: counter(value.totalRescues),
    missions: counter(value.missions),
    victories: counter(value.victories),
    furthestLevel: counter(value.furthestLevel, 3),
    muted: value.muted === true,
    difficulty: value.difficulty === "ace" ? "ace" : "cadet",
  };
}
