export const WORLD = {
  width: 960,
  height: 540,
  groundY: 416,
  playerX: 210,
  playerWidth: 54,
  playerHeight: 86,
} as const;

export const TOTAL_DISTANCE = 450;
export const PIXELS_PER_METER = 32;
export const REGIONS = [
  { name: "Pinewood Trail", start: 0 },
  { name: "Firefly Creek", start: 150 },
  { name: "Starlight Summit", start: 300 },
] as const;

export type Mode = "trail" | "endless";
export type Difficulty = "explorer" | "ranger";
export type Phase = "ready" | "playing" | "paused" | "finished";
export type Outcome = "complete" | "caught" | null;
export interface Obstacle {
  id: number;
  /** Left edge; height is measured up from the ground. */
  x: number;
  w: number;
  h: number;
  kind: "log" | "rock";
  passed: boolean;
}
export interface Pickup {
  id: number;
  /** Center coordinates. */
  x: number;
  y: number;
  kind: "star" | "shield";
}
export interface GameEvent {
  type: "jump" | "doubleJump" | "star" | "shield" | "hit" | "smash" | "checkpoint" | "finish";
  x?: number;
  y?: number;
  value?: number;
  region?: number;
  /** Streak when this star was collected, before any later event in the frame. */
  combo?: number;
}
export interface GameState {
  phase: Phase;
  mode: Mode;
  difficulty: Difficulty;
  outcome: Outcome;
  elapsed: number;
  distance: number;
  score: number;
  stars: number;
  hearts: number;
  bestCombo: number;
  combo: number;
  jumps: number;
  /** Player feet, in world coordinates. */
  y: number;
  vy: number;
  grounded: boolean;
  spin: number;
  shield: number;
  invulnerable: number;
  speed: number;
  region: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  /** Serializable simulation state keeps pause, replay, and tests deterministic. */
  accumulator: number;
  jumpBuffer: number;
  randomState: number;
  nextId: number;
  nextObstacleAt: number;
  nextShieldAt: number;
  nextCheckpoint: number;
  spawnedObstacles: number;
}

const FIXED_STEP = 1 / 120;
const GRAVITY = 1_500;
const JUMP_VELOCITY = -750;
const DOUBLE_JUMP_VELOCITY = -620;
const SHIELD_SECONDS = 7;

function initialSpeed(difficulty: Difficulty) {
  return difficulty === "explorer" ? 250 : 310;
}

export function createGame(
  mode: Mode = "trail",
  difficulty: Difficulty = "explorer",
  random: () => number = Math.random,
): GameState {
  const sample = random();
  const seed = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0.5;
  const speed = initialSpeed(difficulty);
  return {
    phase: "ready",
    mode,
    difficulty,
    outcome: null,
    elapsed: 0,
    distance: 0,
    score: 0,
    stars: 0,
    hearts: 3,
    bestCombo: 0,
    combo: 0,
    jumps: 0,
    y: WORLD.groundY,
    vy: 0,
    grounded: true,
    spin: 0,
    shield: 0,
    invulnerable: 0,
    speed,
    region: 0,
    obstacles: [],
    pickups: [
      { id: 1, kind: "star", x: 530, y: 355 },
      { id: 2, kind: "star", x: 610, y: 355 },
      { id: 3, kind: "star", x: 690, y: 355 },
    ],
    accumulator: 0,
    jumpBuffer: 0,
    randomState: (Math.floor(seed * 0xffff_ffff) >>> 0) || 0x6d2b79f5,
    nextId: 4,
    nextObstacleAt: speed * 2,
    nextShieldAt: 11,
    nextCheckpoint: 150,
    spawnedObstacles: 0,
  };
}

export function startGame(game: GameState): void {
  if (game.phase === "ready") game.phase = "playing";
}

function performJump(game: GameState): "jump" | "doubleJump" {
  const firstJump = game.grounded;
  game.vy = firstJump ? JUMP_VELOCITY : DOUBLE_JUMP_VELOCITY;
  game.jumps = firstJump ? 1 : 2;
  game.grounded = false;
  game.jumpBuffer = 0;
  if (!firstJump) game.spin = 0.5;
  return firstJump ? "jump" : "doubleJump";
}

/** Immediate jumps return true. A tap just before landing can queue the next jump. */
export function jump(game: GameState): boolean {
  if (game.phase !== "playing") return false;
  if (game.grounded || game.jumps < 2) {
    performJump(game);
    return true;
  }
  game.jumpBuffer = 0.12;
  return false;
}

function sample(game: GameState): number {
  let value = game.randomState;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  game.randomState = value >>> 0;
  return game.randomState / 0x1_0000_0000;
}

function spawnObstacle(game: GameState) {
  const first = game.spawnedObstacles === 0;
  const kind = first || sample(game) < 0.6 ? "log" : "rock";
  const obstacle: Obstacle = {
    id: game.nextId++,
    x: WORLD.width + 80,
    w: first ? 78 : kind === "log" ? 84 + sample(game) * 34 : 58 + sample(game) * 20,
    h: first ? 42 : kind === "log" ? 44 + sample(game) * 16 : 55 + sample(game) * 15,
    kind,
    passed: false,
  };
  game.obstacles.push(obstacle);
  // A visible arc rewards the same single jump that clears the obstacle.
  const arc = [
    [-150, 337],
    [-75, 270],
    [0, 215],
    [75, 270],
    [150, 337],
  ];
  for (const [offset, y] of arc) {
    game.pickups.push({ id: game.nextId++, kind: "star", x: obstacle.x + obstacle.w / 2 + offset, y });
  }
  game.spawnedObstacles++;
  // Even at top speed there is time to land and make a fresh jump.
  const maximumSpeed = game.difficulty === "explorer" ? 330 : 410;
  const safeGap = maximumSpeed * (game.difficulty === "explorer" ? 2 : 1.85);
  game.nextObstacleAt = game.distance * PIXELS_PER_METER + safeGap + sample(game) * 230;
}

function finish(game: GameState, outcome: Exclude<Outcome, null>, events: GameEvent[]) {
  game.phase = "finished";
  game.outcome = outcome;
  game.accumulator = 0;
  game.jumpBuffer = 0;
  events.push({ type: "finish" });
}

function collides(game: GameState, obstacle: Obstacle): boolean {
  // Ignore toes, hair, and the corners of rounded rocks. Near misses feel fair.
  const halfWidth = game.difficulty === "explorer" ? 16 : 19;
  return WORLD.playerX + halfWidth > obstacle.x + 7
    && WORLD.playerX - halfWidth < obstacle.x + obstacle.w - 7
    && game.y - 9 > WORLD.groundY - obstacle.h + 7;
}

function reachesPickup(game: GameState, pickup: Pickup): boolean {
  const reach = game.difficulty === "explorer" ? 23 : 18;
  const left = WORLD.playerX - WORLD.playerWidth / 2 + 5;
  const right = WORLD.playerX + WORLD.playerWidth / 2 - 5;
  const top = game.y - WORLD.playerHeight + 6;
  const bottom = game.y - 6;
  const nearestX = Math.max(left, Math.min(right, pickup.x));
  const nearestY = Math.max(top, Math.min(bottom, pickup.y));
  return Math.hypot(pickup.x - nearestX, pickup.y - nearestY) <= reach;
}

function simulate(game: GameState, dt: number, events: GameEvent[]) {
  game.elapsed += dt;
  game.spin = Math.max(0, game.spin - dt);
  game.shield = Math.max(0, game.shield - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  game.jumpBuffer = Math.max(0, game.jumpBuffer - dt);
  game.speed = initialSpeed(game.difficulty)
    + (game.difficulty === "explorer" ? 80 : 100) * Math.min(1, game.distance / TOTAL_DISTANCE);
  const movement = game.speed * dt;
  const previousDistance = game.distance;
  game.distance += movement / PIXELS_PER_METER;
  if (game.mode === "trail") game.distance = Math.min(TOTAL_DISTANCE, game.distance);
  game.score += Math.floor(game.distance) - Math.floor(previousDistance);

  if (!game.grounded) {
    game.y += game.vy * dt + GRAVITY * dt * dt / 2;
    game.vy += GRAVITY * dt;
    if (game.y >= WORLD.groundY) {
      game.y = WORLD.groundY;
      game.vy = 0;
      game.grounded = true;
      game.jumps = 0;
      game.spin = 0;
      if (game.jumpBuffer > 0) events.push({ type: performJump(game) });
    }
  }

  for (const obstacle of game.obstacles) obstacle.x -= movement;
  for (const pickup of game.pickups) pickup.x -= movement;

  game.pickups = game.pickups.filter((pickup) => {
    if (reachesPickup(game, pickup)) {
      if (pickup.kind === "shield") {
        game.shield = SHIELD_SECONDS;
        events.push({ type: "shield", x: pickup.x, y: pickup.y });
      } else {
        game.stars++;
        game.combo++;
        game.bestCombo = Math.max(game.bestCombo, game.combo);
        const bonus = 25 + (game.combo % 5 === 0 ? 25 : 0);
        game.score += bonus;
        events.push({ type: "star", x: pickup.x, y: pickup.y, value: bonus, combo: game.combo });
      }
      return false;
    }
    return pickup.x > -40;
  });

  for (const obstacle of game.obstacles) {
    if (obstacle.passed || !collides(game, obstacle)) continue;
    obstacle.passed = true;
    if (game.shield > 0) {
      game.score += 50;
      events.push({ type: "smash", x: obstacle.x + obstacle.w / 2, y: WORLD.groundY - obstacle.h / 2, value: 50 });
      obstacle.x = -obstacle.w;
    } else if (game.invulnerable <= 0) {
      game.hearts--;
      game.combo = 0;
      game.invulnerable = 1.8;
      events.push({ type: "hit", x: WORLD.playerX, y: game.y - WORLD.playerHeight / 2 });
      if (game.hearts <= 0) {
        finish(game, "caught", events);
        break;
      }
    }
  }
  game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.w > 0);
  if (game.phase !== "playing") return;

  if (game.mode === "trail" && game.distance >= TOTAL_DISTANCE) {
    finish(game, "complete", events);
    return;
  }
  if (game.distance >= game.nextCheckpoint) {
    game.region = Math.floor(game.nextCheckpoint / 150) % REGIONS.length;
    const recovered = game.hearts < 3 ? 1 : 0;
    game.hearts = Math.min(3, game.hearts + 1);
    game.nextCheckpoint += 150;
    events.push({ type: "checkpoint", value: recovered, region: game.region });
  }
  if (game.distance * PIXELS_PER_METER >= game.nextObstacleAt) spawnObstacle(game);
  if (game.elapsed >= game.nextShieldAt) {
    game.pickups.push({ id: game.nextId++, kind: "shield", x: WORLD.width + 80, y: 340 });
    game.nextShieldAt += 14 + sample(game) * 2;
  }
}

/** Fixed steps behave identically at 30, 60, and 120 fps; delayed frames never fast-forward. */
export function stepGame(game: GameState, delta: number): GameEvent[] {
  if (game.phase !== "playing" || !Number.isFinite(delta) || delta <= 0) return [];
  game.accumulator += Math.min(delta, 0.1);
  const events: GameEvent[] = [];
  while (game.accumulator + 1e-10 >= FIXED_STEP && game.phase === "playing") {
    game.accumulator = Math.max(0, game.accumulator - FIXED_STEP);
    simulate(game, FIXED_STEP, events);
  }
  if (game.accumulator < 1e-10) game.accumulator = 0;
  return events;
}
