export const WORLD = {
  width: 960,
  height: 720,
  shipY: 620,
  shipMinX: 44,
  shipMaxX: 916,
  controlTop: 654,
} as const;

export const LEVELS = [
  { rescue: "Nelly", relation: "your dog", sector: "Moon Meadow", bossName: "The Snack Snatcher", weapon: "Soccer Sparks", color: "#7bf3bd" },
  { rescue: "Logan", relation: "your brother", sector: "Goal Galaxy", bossName: "The Goal Gobbler", weapon: "Twin Kick", color: "#79c9ff" },
  { rescue: "Dylan", relation: "your dad", sector: "Diamond Drift", bossName: "The Grand Slam Saucer", weapon: "Baseball Burst", color: "#ffad86" },
  { rescue: "Beth", relation: "your mom", sector: "Home Star", bossName: "The Cosmic Crown", weapon: "All-Star Blaster", color: "#c8a0ff" },
] as const;

export type Difficulty = "cadet" | "ace";
export type Phase = "ready" | "playing" | "paused" | "rescued" | "lost" | "won";
export type Stage = "wave" | "boss";
export type GameEvent = { type: "shoot" | "alien" | "hit" | "boss" | "upgrade" | "rescue" | "win" | "lose"; level?: number; value?: number };

export interface Alien {
  id: number;
  x: number;
  y: number;
  hp: number;
  kind: 0 | 1 | 2;
  radius: number;
  row: number;
  column: number;
}

export interface Shot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  kind?: string;
}

export interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  attackTime: number;
  warning: boolean;
  pattern: number;
  /** Frozen during the warning, giving Bradley a chance to move away. */
  aimX: number;
  /** Fire columns for the baseball boss; the missing column is a safe lane. */
  lanes: number[];
  warningTime: number;
  attackCount: number;
  volleyIndex: number;
  volleyTime: number;
}

export interface Effect {
  x: number;
  y: number;
  age: number;
  life: number;
  kind: "pop" | "hit" | "rescue" | "upgrade";
  color?: string;
  radius?: number;
}

interface Checkpoint {
  score: number;
  kills: number;
  shots: number;
  weaponTier: number;
  randomState: number;
}

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  level: number;
  stage: Stage;
  wave: number;
  elapsed: number;
  stageTime: number;
  playerX: number;
  targetX: number;
  lives: number;
  invulnerable: number;
  shield: number;
  score: number;
  kills: number;
  /** Number of volleys fired, rather than individual projectiles. */
  shots: number;
  rescued: string[];
  weaponTier: number;
  upgradeFlash: number;
  aliens: Alien[];
  shotsPlayer: Shot[];
  shotsEnemy: Shot[];
  boss: Boss | null;
  effects: Effect[];
  accumulator: number;
  fireTime: number;
  enemyFireTime: number;
  formationDirection: number;
  transitionTime: number;
  randomState: number;
  nextId: number;
  checkpoint: Checkpoint;
}

const FIXED_STEP = 1 / 120;
const PLAYER_RADIUS = 14;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function random(game: GameState): number {
  game.randomState = (Math.imul(game.randomState, 1664525) + 1013904223) >>> 0;
  return game.randomState / 4294967296;
}

function spawnWave(game: GameState) {
  game.stage = "wave";
  game.stageTime = 0;
  game.formationDirection = game.wave === 0 ? 1 : -1;
  game.enemyFireTime = 0;
  game.aliens = [];
  const columns = game.difficulty === "cadet" ? 6 : 7;
  const spacing = 92;
  const startX = WORLD.width / 2 - ((columns - 1) * spacing) / 2;
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < columns; column++) {
      const kind = ((column + row + game.level) % 3) as Alien["kind"];
      game.aliens.push({
        id: game.nextId++, x: startX + column * spacing, y: 126 + row * 70,
        hp: game.level >= 2 && row === 0 ? 2 : 1,
        kind, radius: 23, row, column,
      });
    }
  }
}

function saveCheckpoint(game: GameState) {
  game.checkpoint = {
    score: game.score, kills: game.kills, shots: game.shots,
    weaponTier: game.weaponTier, randomState: game.randomState,
  };
}

function prepareLevel(game: GameState) {
  game.wave = 0;
  game.lives = 5;
  game.playerX = game.targetX = WORLD.width / 2;
  game.invulnerable = 0;
  game.shield = 2;
  game.upgradeFlash = 0;
  game.accumulator = 0;
  game.fireTime = 0.2;
  game.transitionTime = 0;
  game.shotsPlayer = [];
  game.shotsEnemy = [];
  game.effects = [];
  game.boss = null;
  spawnWave(game);
}

/** Supplying a seed makes the entire simulation repeatable and serializable. */
export function createGame(difficulty: Difficulty = "cadet", seed = Math.random() * 4294967296, startingLevel = 0): GameState {
  const level = Number.isFinite(startingLevel) ? clamp(Math.floor(startingLevel), 0, LEVELS.length - 1) : 0;
  const game: GameState = {
    phase: "ready", difficulty, level, stage: "wave", wave: 0,
    elapsed: 0, stageTime: 0, playerX: 480, targetX: 480, lives: 5,
    invulnerable: 0, shield: 2, score: 0, kills: 0, shots: 0,
    rescued: LEVELS.slice(0, level).map((mission) => mission.rescue),
    weaponTier: level + 1, upgradeFlash: 0, aliens: [], shotsPlayer: [], shotsEnemy: [],
    boss: null, effects: [], accumulator: 0, fireTime: 0, enemyFireTime: 0,
    formationDirection: 1, transitionTime: 0,
    randomState: Number.isFinite(seed) ? seed >>> 0 : 1, nextId: 1,
    checkpoint: { score: 0, kills: 0, shots: 0, weaponTier: 1, randomState: 1 },
  };
  saveCheckpoint(game);
  prepareLevel(game);
  return game;
}

export function startGame(game: GameState): void {
  if (game.phase === "ready") game.phase = "playing";
}

export function moveShip(game: GameState, x: number): void {
  if (game.phase === "playing" && Number.isFinite(x)) {
    game.targetX = clamp(x, WORLD.shipMinX, WORLD.shipMaxX);
  }
}

/** The rescue screen advances only on Bradley's tap, never on a timer. */
export function nextLevel(game: GameState): void {
  if (game.phase !== "rescued" || game.level >= LEVELS.length - 1) return;
  game.level++;
  saveCheckpoint(game);
  prepareLevel(game);
  game.phase = "playing";
}

/** Retry the current mission without counting its unfinished rewards twice. */
export function retryLevel(game: GameState): void {
  if (game.phase !== "lost") return;
  Object.assign(game, game.checkpoint);
  prepareLevel(game);
  game.phase = "playing";
}

function addEffect(game: GameState, x: number, y: number, kind: Effect["kind"], life = 0.55) {
  if (game.effects.length >= 48) game.effects.shift();
  game.effects.push({ x, y, age: 0, life, kind, color: LEVELS[game.level].color });
}

function shoot(game: GameState, events: GameEvent[]) {
  const tier = game.weaponTier;
  const offsets = tier === 1 ? [0] : tier === 2 ? [-12, 12] : [-20, 0, 20];
  for (const offset of offsets) {
    game.shotsPlayer.push({
      id: game.nextId++, x: game.playerX + offset, y: WORLD.shipY - 28,
      vx: tier >= 3 ? offset * 3.6 : offset * 1.4, vy: -650,
      radius: tier >= 3 ? 7 : 6,
      damage: tier === 4 && offset === 0 ? 2 : 1,
      kind: tier < 3 ? "soccer" : tier === 3 ? "baseball" : "star",
    });
  }
  game.shots++;
  events.push({ type: "shoot", value: tier });
}

function enemyShot(game: GameState, x: number, y: number, vx: number, vy: number, kind = "alien") {
  if (game.shotsEnemy.length >= 28) return;
  game.shotsEnemy.push({ id: game.nextId++, x, y, vx, vy, radius: kind === "boss" ? 8 : 7, damage: 1, kind });
}

function updateAliens(game: GameState, dt: number) {
  if (!game.aliens.length) return;
  const speed = (game.difficulty === "cadet" ? 34 : 46) + game.level * 7 + game.wave * 4;
  const dx = speed * dt * game.formationDirection;
  const left = Math.min(...game.aliens.map((alien) => alien.x));
  const right = Math.max(...game.aliens.map((alien) => alien.x));
  const bounce = left + dx < 62 || right + dx > WORLD.width - 62;
  if (bounce) game.formationDirection *= -1;
  for (const alien of game.aliens) {
    alien.x += bounce ? -dx : dx;
    if (bounce) alien.y = Math.min(alien.y + 12, 360);
  }

  game.enemyFireTime += dt;
  const interval = (game.difficulty === "cadet" ? 1.6 : 1.05) - game.level * 0.1;
  if (game.stageTime >= 1.1 && game.enemyFireTime >= interval) {
    game.enemyFireTime -= interval;
    const cap = game.difficulty === "cadet" ? 9 : 14;
    if (game.shotsEnemy.length < cap) {
      const front = game.aliens.filter((alien) => !game.aliens.some((other) => other.column === alien.column && other.y > alien.y));
      const alien = front[Math.floor(random(game) * front.length)];
      enemyShot(game, alien.x, alien.y + 26, 0, (game.difficulty === "cadet" ? 150 : 200) + game.level * 13);
    }
  }
}

function spawnBoss(game: GameState, events: GameEvent[]) {
  game.stage = "boss";
  game.stageTime = 0;
  game.shotsEnemy = [];
  game.shotsPlayer = [];
  // Upgraded sports blasters hit hard; each boss lives long enough to show its moves.
  const maxHp = game.difficulty === "cadet" ? 110 + game.level * 50 : 145 + game.level * 65;
  game.boss = {
    x: 480, y: 158, hp: maxHp, maxHp, radius: 63 + game.level * 3,
    attackTime: -0.8, warning: false, pattern: game.level,
    aimX: game.playerX, lanes: [], warningTime: 0, attackCount: 0,
    volleyIndex: -1, volleyTime: 0,
  };
  events.push({ type: "boss", level: game.level });
}

function fireBossVolley(game: GameState) {
  const boss = game.boss!;
  const speed = (game.difficulty === "cadet" ? 175 : 235) + game.level * 8;
  if (boss.pattern === 2) {
    boss.volleyIndex = 0;
    boss.volleyTime = 0;
    return;
  }
  const aim = Math.atan2(boss.aimX - boss.x, WORLD.shipY - boss.y);
  const count = boss.pattern === 0 ? 1 : boss.pattern === 1 ? 3 : 5;
  for (let index = 0; index < count; index++) {
    const angle = clamp(aim + (index - (count - 1) / 2) * 0.25, -1.05, 1.05);
    enemyShot(game, boss.x, boss.y + boss.radius * 0.65, Math.sin(angle) * speed, Math.cos(angle) * speed, "boss");
  }
}

function updateBoss(game: GameState, dt: number) {
  const boss = game.boss!;
  boss.x = 480 + Math.sin(game.stageTime * (0.48 + game.level * 0.055)) * (235 + game.level * 8);
  boss.y = 154 + Math.sin(game.stageTime * 0.9) * 13;
  const interval = (game.difficulty === "cadet" ? 2.5 : 1.9) - game.level * 0.1;
  const warningDuration = game.difficulty === "cadet" ? 0.7 : 0.55;
  boss.attackTime += dt;
  if (!boss.warning && boss.attackTime >= interval - warningDuration) {
    boss.warning = true;
    boss.aimX = game.playerX;
    if (boss.pattern === 2) {
      const columns = [120, 300, 480, 660, 840];
      // Rotate a generous open lane. Only four of five columns ever fire.
      const safeLane = boss.attackCount % columns.length;
      boss.lanes = columns.filter((_, index) => index !== safeLane);
    }
  }
  boss.warningTime = boss.warning ? Math.max(0, interval - boss.attackTime) : 0;
  if (boss.attackTime >= interval) {
    fireBossVolley(game);
    boss.attackTime -= interval;
    boss.attackCount++;
    boss.warning = false;
    boss.warningTime = 0;
  }
  if (boss.volleyIndex >= 0) {
    boss.volleyTime -= dt;
    if (boss.volleyTime <= 0) {
      enemyShot(game, boss.lanes[boss.volleyIndex], 205, 0,
        (game.difficulty === "cadet" ? 170 : 230) + game.level * 8, "boss");
      boss.volleyIndex++;
      boss.volleyTime += 0.18;
      if (boss.volleyIndex >= boss.lanes.length) boss.volleyIndex = -1;
    }
  }
}

function intersectsSegment(x0: number, y0: number, x1: number, y1: number, x: number, y: number, radius: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length2 = dx * dx + dy * dy;
  const position = length2 ? clamp(((x - x0) * dx + (y - y0) * dy) / length2, 0, 1) : 0;
  return Math.hypot(x0 + dx * position - x, y0 + dy * position - y) <= radius + 1e-8;
}

function inBounds(shot: Shot) {
  return shot.x >= -32 && shot.x <= WORLD.width + 32 && shot.y >= -32 && shot.y <= WORLD.controlTop + 18;
}

function awardAlien(game: GameState, alien: Alien, events: GameEvent[]) {
  game.kills++;
  game.score += 100;
  addEffect(game, alien.x, alien.y, "pop");
  events.push({ type: "alien", value: game.score });
  const nextTier = game.kills >= 36 ? 4 : game.kills >= 18 ? 3 : game.kills >= 6 ? 2 : 1;
  if (nextTier > game.weaponTier) {
    game.weaponTier = nextTier;
    game.upgradeFlash = 2;
    addEffect(game, game.playerX, WORLD.shipY, "upgrade", 0.9);
    events.push({ type: "upgrade", value: nextTier });
  }
}

function rescue(game: GameState, events: GameEvent[]) {
  const person = LEVELS[game.level].rescue;
  if (!game.rescued.includes(person)) game.rescued.push(person);
  game.score += 1000 + game.level * 250;
  game.shotsEnemy = [];
  game.shotsPlayer = [];
  game.upgradeFlash = 0;
  addEffect(game, game.boss!.x, game.boss!.y, "rescue", 1.4);
  game.phase = game.level === LEVELS.length - 1 ? "won" : "rescued";
  events.push({ type: "rescue", level: game.level });
  if (game.phase === "won") events.push({ type: "win", value: game.score });
}

function updateShots(game: GameState, dt: number, oldPlayerX: number, events: GameEvent[]) {
  const survivingPlayer: Shot[] = [];
  for (const shot of game.shotsPlayer) {
    const oldX = shot.x;
    const oldY = shot.y;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    let consumed = false;
    if (game.stage === "wave") {
      for (const alien of game.aliens) {
        if (alien.hp > 0 && intersectsSegment(oldX, oldY, shot.x, shot.y, alien.x, alien.y, alien.radius + shot.radius)) {
          alien.hp -= shot.damage;
          consumed = true;
          if (alien.hp <= 0) awardAlien(game, alien, events);
          else addEffect(game, alien.x, alien.y, "hit", 0.2);
          break;
        }
      }
    } else if (game.boss && intersectsSegment(oldX, oldY, shot.x, shot.y, game.boss.x, game.boss.y, game.boss.radius + shot.radius)) {
      game.boss.hp = Math.max(0, game.boss.hp - shot.damage);
      consumed = true;
      addEffect(game, shot.x, shot.y, "hit", 0.15);
      if (game.boss.hp === 0) {
        rescue(game, events);
        return;
      }
    }
    if (!consumed && inBounds(shot)) survivingPlayer.push(shot);
  }
  game.shotsPlayer = survivingPlayer;
  game.aliens = game.aliens.filter((alien) => alien.hp > 0);
  const survivingEnemy: Shot[] = [];
  for (const shot of game.shotsEnemy) {
    const oldX = shot.x;
    const oldY = shot.y;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    // Relative swept collision catches fast bullets and a moving ship fairly.
    const hit = intersectsSegment(oldX - oldPlayerX, oldY, shot.x - game.playerX, shot.y, 0, WORLD.shipY, PLAYER_RADIUS + shot.radius);
    if (hit) {
      if (game.invulnerable <= 0 && game.shield <= 0) {
        game.lives = Math.max(0, game.lives - 1);
        game.invulnerable = 1.6;
        addEffect(game, game.playerX, WORLD.shipY, "hit", 0.7);
        events.push({ type: "hit", value: game.lives });
        if (game.lives === 0) {
          game.phase = "lost";
          game.shotsEnemy = [];
          game.shotsPlayer = [];
          events.push({ type: "lose", level: game.level });
          return;
        }
      }
    } else if (inBounds(shot)) survivingEnemy.push(shot);
  }
  game.shotsEnemy = survivingEnemy;
}

function simulate(game: GameState, dt: number, events: GameEvent[]) {
  game.elapsed += dt;
  game.stageTime += dt;
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  game.shield = Math.max(0, game.shield - dt);
  game.upgradeFlash = Math.max(0, game.upgradeFlash - dt);
  for (const effect of game.effects) effect.age += dt;
  game.effects = game.effects.filter((effect) => effect.age < effect.life);
  const oldPlayerX = game.playerX;
  game.playerX += clamp(game.targetX - game.playerX, -920 * dt, 920 * dt);

  if (game.transitionTime > 0) {
    game.transitionTime -= dt;
    if (game.transitionTime <= 0) {
      game.transitionTime = 0;
      if (game.wave === 0) {
        game.wave = 1;
        spawnWave(game);
      } else spawnBoss(game, events);
    }
    return;
  }

  game.fireTime += dt;
  const interval = 0.24 - (game.weaponTier - 1) * 0.02;
  if (game.fireTime >= interval) {
    game.fireTime -= interval;
    if (game.shotsPlayer.length < 90) shoot(game, events);
  }
  if (game.stage === "wave") updateAliens(game, dt);
  else updateBoss(game, dt);
  updateShots(game, dt, oldPlayerX, events);

  if (game.phase === "playing" && game.stage === "wave" && game.aliens.length === 0) {
    game.transitionTime = 0.85;
    game.shotsPlayer = [];
    game.shotsEnemy = [];
    game.fireTime = 0;
  }
}

/** Fixed updates keep touch, collisions, and patterns identical at 30/60/120 Hz. */
export function stepGame(game: GameState, delta: number): GameEvent[] {
  if (game.phase !== "playing" || !Number.isFinite(delta) || delta <= 0) return [];
  game.accumulator += Math.min(delta, 0.1);
  const events: GameEvent[] = [];
  while (game.accumulator + 1e-9 >= FIXED_STEP && game.phase === "playing") {
    game.accumulator = Math.max(0, game.accumulator - FIXED_STEP);
    simulate(game, FIXED_STEP, events);
  }
  if (game.accumulator < 1e-9) game.accumulator = 0;
  return events;
}
