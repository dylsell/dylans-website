export const WORLD = {
  width: 960,
  height: 600,
  goalLeft: 80,
  goalRight: 880,
  goalTop: 80,
  goalBottom: 490,
} as const;

export const TOTAL_SHOTS = 10;
export const WIN_SAVES = 6;

export type Difficulty = "rookie" | "pro";
export type Phase = "ready" | "playing" | "paused" | "finished";
export type Stage = "windup" | "flight" | "result";
export type GameEvent = { type: "kick" | "save" | "goal" | "finish" };

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  stage: Stage;
  elapsed: number;
  shotIndex: number;
  totalShots: number;
  saves: number;
  goals: number;
  streak: number;
  bestStreak: number;
  keeperX: number;
  keeperY: number;
  targetX: number;
  targetY: number;
  windupDuration: number;
  flightDuration: number;
  resultDuration: number;
  lastResult: "save" | "goal" | null;
  lastReaction: number | null;
  bestReaction: number | null;
  results: ("save" | "goal")[];
  /** Planned once so a game has no hidden timers or random state. */
  shotTargets: { x: number; y: number }[];
  /** First time the gloves reached this shot's catch zone, in seconds. */
  reactionAt: number | null;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function getSaveRadius(game: GameState): number {
  return game.difficulty === "rookie" ? 85 : 65;
}

function prepareShot(game: GameState) {
  const target = game.shotTargets[game.shotIndex];
  game.stage = "windup";
  game.elapsed = 0;
  game.targetX = target.x;
  game.targetY = target.y;
  game.windupDuration = game.difficulty === "rookie" ? 1.1 : 0.95;
  game.flightDuration = (game.difficulty === "rookie" ? 1.68 : 1.22) - game.shotIndex * 0.02;
  game.lastResult = null;
  game.lastReaction = null;
  game.reactionAt = null;
}

export function createGame(
  difficulty: Difficulty = "rookie",
  random: () => number = Math.random,
): GameState {
  const sample = () => {
    const value = random();
    return Number.isFinite(value) ? clamp(value, 0, 1) : 0.5;
  };
  const inset = 40;
  const shotTargets = Array.from({ length: TOTAL_SHOTS }, () => ({
    x: WORLD.goalLeft + inset + sample() * (WORLD.goalRight - WORLD.goalLeft - inset * 2),
    y: WORLD.goalTop + inset + sample() * (WORLD.goalBottom - WORLD.goalTop - inset * 2),
  }));
  const game: GameState = {
    phase: "ready",
    difficulty,
    stage: "windup",
    elapsed: 0,
    shotIndex: 0,
    totalShots: TOTAL_SHOTS,
    saves: 0,
    goals: 0,
    streak: 0,
    bestStreak: 0,
    keeperX: WORLD.width / 2,
    keeperY: 390,
    targetX: shotTargets[0].x,
    targetY: shotTargets[0].y,
    windupDuration: 0,
    flightDuration: 0,
    resultDuration: 1.2,
    lastResult: null,
    lastReaction: null,
    bestReaction: null,
    results: [],
    shotTargets,
    reactionAt: null,
  };
  prepareShot(game);
  return game;
}

export function startGame(game: GameState): void {
  if (game.phase === "ready") game.phase = "playing";
}

function glovesReachTarget(game: GameState): boolean {
  return Math.hypot(game.keeperX - game.targetX, game.keeperY - game.targetY) <= getSaveRadius(game);
}

function recordReaction(game: GameState) {
  if (game.stage === "flight" && game.reactionAt === null && glovesReachTarget(game)) {
    game.reactionAt = game.elapsed;
  }
}

export function moveKeeper(game: GameState, x: number, y: number): void {
  if (game.phase !== "playing" || !Number.isFinite(x) || !Number.isFinite(y)) return;
  game.keeperX = clamp(x, WORLD.goalLeft, WORLD.goalRight);
  game.keeperY = clamp(y, WORLD.goalTop, WORLD.goalBottom);
  recordReaction(game);
}

export function getBallPosition(game: GameState): { x: number; y: number; scale: number; progress: number } {
  const progress = game.stage === "result"
    ? 1
    : game.stage === "flight"
      ? clamp(game.elapsed / game.flightDuration, 0, 1)
      : 0;
  // Perspective makes an approaching ball grow and travel faster near the gloves.
  const travel = Math.pow(progress, 1.25);
  return {
    x: 480 + (game.targetX - 480) * travel,
    y: 335 + (game.targetY - 335) * travel - Math.sin(progress * Math.PI) * 42,
    scale: 1 + Math.pow(progress, 1.65) * 3,
    progress,
  };
}

export function stepGame(game: GameState, delta: number): GameEvent[] {
  if (game.phase !== "playing" || !Number.isFinite(delta) || delta <= 0) return [];

  // Discard background-tab backlog while retaining normal low-end tablet frame time.
  let remaining = Math.min(delta, 0.1);
  const events: GameEvent[] = [];
  while (remaining > 0 && game.phase === "playing") {
    const duration = game.stage === "windup"
      ? game.windupDuration
      : game.stage === "flight"
        ? game.flightDuration
        : game.resultDuration;
    const advance = Math.min(remaining, Math.max(0, duration - game.elapsed));
    recordReaction(game);
    game.elapsed += advance;
    remaining -= advance;

    if (game.elapsed < duration - 1e-9) break;
    game.elapsed = 0;

    if (game.stage === "windup") {
      game.stage = "flight";
      recordReaction(game);
      events.push({ type: "kick" });
    } else if (game.stage === "flight") {
      const result = glovesReachTarget(game) ? "save" : "goal";
      game.stage = "result";
      game.lastResult = result;
      game.results.push(result);
      if (result === "save") {
        game.saves++;
        game.streak++;
        game.bestStreak = Math.max(game.bestStreak, game.streak);
        game.lastReaction = game.reactionAt ?? duration;
        game.bestReaction = game.bestReaction === null
          ? game.lastReaction
          : Math.min(game.bestReaction, game.lastReaction);
      } else {
        game.goals++;
        game.streak = 0;
        game.lastReaction = null;
      }
      events.push({ type: result });
    } else if (game.shotIndex + 1 >= game.totalShots) {
      game.phase = "finished";
      events.push({ type: "finish" });
    } else {
      game.shotIndex++;
      prepareShot(game);
    }
  }
  return events;
}
