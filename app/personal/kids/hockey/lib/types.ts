export const WORLD = { width: 1100, height: 760, netLeft: 390, netRight: 710, netTop: 210, netBottom: 340, playerY: 615 };
export type Phase = "lobby" | "playing" | "paused" | "round" | "won";
export type Difficulty = "rookie" | "allstar";
export type ShotResult = "goal" | "save" | "post";
export interface Flight { fromX: number; fromY: number; toX: number; toY: number; progress: number; power: number; result: ShotResult | null }
export interface ArenaFrame {
  time: number;
  phase: Phase;
  playerX: number;
  goalieX: number;
  goalieLean: number;
  aimX: number;
  aimY: number;
  charge: number;
  flight: Flight | null;
  celebration: number;
  hatTrick: boolean;
  jersey: number;
  round: number;
  goals: number;
  reducedMotion: boolean;
}
export const ROUNDS = [
  { name: "Home ice", arena: "TAMPA BAY", goal: 3, cue: "Find an open corner. Your crowd is right behind you.", color: "#53cdff" },
  { name: "All-star night", arena: "ALL-STAR ARENA", goal: 3, cue: "Keep the goalie guessing. Try the other side!", color: "#b3a0ff" },
  { name: "The cup final", arena: "CHAMPIONSHIP ICE", goal: 3, cue: "Three more goals, Captain Bradley. Bring the cup home!", color: "#ffe08a" },
] as const;
