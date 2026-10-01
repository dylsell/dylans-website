export const PROFILE_KEY = "bradley-soccer-profile-v1";

export interface Profile {
  careerSaves: number;
  matches: number;
  cups: number;
  bestStreak: number;
  bestScore: number;
  muted: boolean;
}

export const DEFAULT_PROFILE: Profile = Object.freeze({
  careerSaves: 0,
  matches: 0,
  cups: 0,
  bestStreak: 0,
  bestScore: 0,
  muted: false,
});

function counter(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum
    ? value === 0 ? 0 : value
    : 0;
}

/** Recover valid fields from saved data without trusting its shape or touching storage. */
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
    careerSaves: counter(value.careerSaves),
    matches: counter(value.matches),
    cups: counter(value.cups),
    bestStreak: counter(value.bestStreak, 10),
    bestScore: counter(value.bestScore, 10),
    muted: value.muted === true,
  };
}
