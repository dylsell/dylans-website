import { Difficulty, Flight, Phase, ROUNDS, ShotResult, WORLD } from "./types";

export interface Game {
  phase: Phase;
  difficulty: Difficulty;
  round: number;
  goals: number;
  totalGoals: number;
  shots: number;
  streak: number;
  bestStreak: number;
  powerGoals: number;
  time: number;
  playerX: number;
  goalieX: number;
  goalieLean: number;
  aimX: number;
  aimY: number;
  charging: boolean;
  charge: number;
  flight: Flight | null;
  cooldown: number;
  celebration: number;
  hatTrick: boolean;
  result: ShotResult | null;
}
export type GameEvent = { type: "goal" | "save" | "post" | "round" | "win"; hatTrick?: boolean; power?: boolean };
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function createGame(difficulty: Difficulty = "rookie"): Game {
  return { phase: "lobby", difficulty, round: 0, goals: 0, totalGoals: 0, shots: 0, streak: 0, bestStreak: 0, powerGoals: 0,
    time: 0, playerX: 470, goalieX: 550, goalieLean: 0, aimX: 455, aimY: 248,
    charging: false, charge: 0, flight: null, cooldown: 0, celebration: 0, hatTrick: false, result: null };
}
export function canShoot(game: Game) { return game.phase === "playing" && !game.flight && game.cooldown <= 0; }
export function shoot(game: Game): boolean {
  if (!canShoot(game)) { game.charging = false; game.charge = 0; return false; }
  game.flight = { fromX: game.playerX + 85, fromY: 676, toX: game.aimX, toY: game.aimY, progress: 0, power: game.charge, result: null };
  game.shots++;
  game.charging = false;
  game.charge = 0;
  game.result = null;
  return true;
}
export function resolveShot(x: number, y: number, goalieX: number, power: number, difficulty: Difficulty): ShotResult {
  if (x <= WORLD.netLeft + 11 || x >= WORLD.netRight - 11 || y <= WORLD.netTop + 8) return "post";
  const reach = (y < 246 ? 29 : difficulty === "rookie" ? 46 : 58) * (power >= 0.7 ? 0.78 : 1);
  return Math.abs(x - goalieX) < reach ? "save" : "goal";
}
export function advanceRound(game: Game) {
  if (game.phase !== "round") return;
  game.round++;
  game.goals = 0;
  game.phase = "playing";
  game.result = null;
  game.flight = null;
  game.cooldown = 0;
  game.celebration = 0;
  game.hatTrick = false;
}
export function stepGame(game: Game, delta: number): GameEvent[] {
  if (game.phase !== "playing") return [];
  const dt = clamp(delta, 0, 0.05);
  game.time += dt;
  game.celebration = Math.max(0, game.celebration - dt / 1.8);
  if (game.charging && canShoot(game)) game.charge = Math.min(1, game.charge + dt / 0.9);
  const speed = (game.difficulty === "rookie" ? 1.05 : 1.8) + game.round * 0.27;
  const oldGoalie = game.goalieX;
  // The goalie commits once a shot leaves the stick, giving a well-aimed shot a fair opening.
  if (!game.flight || game.flight.result) game.goalieX = 550 + Math.sin(game.time * speed) * (game.difficulty === "rookie" ? 93 : 108);
  game.goalieLean = (game.goalieX - oldGoalie) / Math.max(dt, 0.001) / 180;
  const playerTarget = 470 + (game.aimX - 550) * 0.62;
  game.playerX += (playerTarget - game.playerX) * Math.min(1, dt * 7);
  const events: GameEvent[] = [];
  if (game.flight && !game.flight.result) {
    game.flight.progress = Math.min(1, game.flight.progress + dt / (game.flight.power >= 0.7 ? 0.36 : 0.55));
    if (game.flight.progress >= 1) {
      const f = game.flight;
      const result = resolveShot(f.toX, f.toY, game.goalieX, f.power, game.difficulty);
      f.result = result;
      game.result = result;
      game.cooldown = result === "goal" ? 1.7 : 0.85;
      if (result === "goal") {
        game.goals++;
        game.totalGoals++;
        game.streak++;
        game.bestStreak = Math.max(game.streak, game.bestStreak);
        if (f.power >= 0.7) game.powerGoals++;
        game.hatTrick = game.goals === 3;
        game.celebration = 1;
      } else game.streak = 0;
      events.push({ type: result, hatTrick: game.hatTrick && result === "goal", power: f.power >= 0.7 });
    }
  } else if (game.cooldown > 0) {
    game.cooldown = Math.max(0, game.cooldown - dt);
    if (game.cooldown === 0) {
      game.flight = null;
      game.result = null;
      if (game.goals >= ROUNDS[game.round].goal) {
        game.phase = game.round === ROUNDS.length - 1 ? "won" : "round";
        events.push({ type: game.phase === "won" ? "win" : "round" });
      }
    }
  }
  return events;
}
