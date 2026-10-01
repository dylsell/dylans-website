import assert from "node:assert/strict";
import test from "node:test";
import { createGame, LEVELS, moveShip, nextLevel, retryLevel, startGame, stepGame, WORLD } from "./game";
import type { Difficulty, GameEvent, GameState, Phase, Shot } from "./game";

const DT = 1 / 120;

function playingGame(difficulty: Difficulty = "cadet", level = 0) {
  const game = createGame(difficulty, 17, level);
  startGame(game);
  return game;
}

function advance(game: GameState, seconds: number): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) events.push(...stepGame(game, DT));
  return events;
}

function makeShot(game: GameState, x: number, y: number, overrides: Partial<Shot> = {}): Shot {
  return { id: game.nextId++, x, y, vx: 0, vy: 0, radius: 6, damage: 1, ...overrides };
}

function reachBoss(game: GameState) {
  game.aliens = [];
  advance(game, 0.9);
  assert.equal(game.wave, 1);
  game.aliens = [];
  advance(game, 0.9);
  assert.equal(game.stage, "boss");
  assert.ok(game.boss);
  // Isolate attack timing without modifying the boss's ordinary health/damage rules.
  game.fireTime = -1000;
  game.shotsPlayer = [];
}

function pilot(game: GameState) {
  let target = game.boss?.x ?? game.aliens.reduce((nearest, alien) =>
    Math.abs(alien.x - game.playerX) < Math.abs(nearest.x - game.playerX) ? alien : nearest,
  game.aliens[0] ?? { x: game.playerX }).x;
  const threats = game.shotsEnemy
    .filter((shot) => shot.vy > 0 && (WORLD.shipY - shot.y) / shot.vy < 0.85)
    .map((shot) => shot.x + shot.vx * Math.max(0, (WORLD.shipY - shot.y) / shot.vy));
  if (threats.some((x) => Math.abs(x - target) < 45)) {
    const score = (x: number) => Math.abs(x - target) + threats.reduce((sum, threat) => sum + Math.max(0, 70 - Math.abs(threat - x)) * 10, 0);
    target = Array.from({ length: 25 }, (_, i) => WORLD.shipMinX + i * (WORLD.shipMaxX - WORLD.shipMinX) / 24)
      .sort((a, b) => score(a) - score(b))[0];
  }
  moveShip(game, target);
}

for (const difficulty of ["cadet", "ace"] as const) {
  test(`${difficulty}: automatic firing and dodging can rescue the entire family through four unique bosses`, () => {
    const game = playingGame(difficulty);
    const events: GameEvent[] = [];
    const bossPatterns: number[] = [];
    const attacks: number[] = [];
    for (let frame = 0; frame < 60 * 300 && game.phase !== "won" && game.phase !== "lost"; frame++) {
      if (game.phase === "rescued") {
        attacks.push(game.boss!.attackCount);
        nextLevel(game);
        assert.equal(game.lives, 5);
      }
      pilot(game);
      const frameEvents = stepGame(game, 1 / 60);
      if (frameEvents.some((event) => event.type === "boss")) bossPatterns.push(game.boss!.pattern);
      events.push(...frameEvents);
    }
    attacks.push(game.boss!.attackCount);
    assert.equal(game.phase, "won");
    assert.deepEqual(game.rescued, ["Nelly", "Logan", "Dylan", "Beth"]);
    assert.deepEqual(bossPatterns, [0, 1, 2, 3]);
    assert.ok(attacks.every((count) => count >= 2), `Bosses should demonstrate their attack patterns: ${attacks}`);
    assert.equal(game.kills, difficulty === "cadet" ? 96 : 112);
    assert.equal(game.weaponTier, 4);
    assert.equal(events.filter((event) => event.type === "rescue").length, 4);
    assert.equal(events.filter((event) => event.type === "win").length, 1);
    assert.equal(events.filter((event) => event.type === "upgrade").length, 3);
    assert.equal(game.shotsEnemy.length, 0);
    assert.equal(game.shotsPlayer.length, 0);
    const snapshot = structuredClone(game);
    assert.deepEqual(advance(game, 2), []);
    nextLevel(game);
    retryLevel(game);
    assert.deepEqual(game, snapshot);
  });
}

for (let level = 0; level < 4; level++) {
  test(`boss ${level + 1}: warnings are readable and its distinct attack leaves room and time to dodge`, () => {
    const game = playingGame("cadet", level);
    reachBoss(game);
    let warningStart = -1;
    let firstShotTime = -1;
    let lockedAim = -1;
    const shots: Shot[] = [];
    for (let i = 0; i < 600; i++) {
      stepGame(game, DT);
      if (game.boss!.warning && warningStart === -1) {
        warningStart = game.elapsed;
        lockedAim = game.boss!.aimX;
        moveShip(game, WORLD.shipMinX);
      }
      if (game.boss!.warning) assert.equal(game.boss!.aimX, lockedAim);
      for (const shot of game.shotsEnemy) {
        if (!shots.some((previous) => previous.id === shot.id)) {
          if (firstShotTime === -1) firstShotTime = game.elapsed;
          shots.push({ ...shot });
        }
      }
      if (game.boss!.attackCount === 1 && game.boss!.volleyIndex === -1) break;
    }
    assert.ok(warningStart > 0);
    assert.ok(firstShotTime - warningStart >= 0.68, "At least two thirds of a second of warning");
    assert.equal(shots.length, [1, 3, 4, 5][level]);
    for (const shot of shots) {
      assert.ok((WORLD.shipY - shot.y) / shot.vy > 1.8, "Slow bullets leave a substantial reaction window");
      assert.ok(shot.vy > 0);
    }
    const arrivals = shots.map((shot) => shot.x + shot.vx * (WORLD.shipY - shot.y) / shot.vy).sort((a, b) => a - b);
    for (let i = 1; i < arrivals.length; i++) assert.ok(arrivals[i] - arrivals[i - 1] > 70, "There is room for the ship between projectiles");
    if (level === 2) {
      assert.equal(new Set(shots.map((shot) => shot.x)).size, 4);
      assert.equal(game.boss!.lanes.length, 4);
      assert.ok(!game.boss!.lanes.includes(120), "The first volley leaves the left lane completely open");
    }
  });
}

test("alien kills automatically upgrade the blaster at 6, 18, and 36; armored aliens count once", () => {
  const game = playingGame();
  game.fireTime = -1000;
  const upgrades: number[] = [];
  for (let kill = 1; kill <= 40; kill++) {
    game.aliens = [{ id: game.nextId++, x: 480, y: 220, hp: 2, kind: 2, radius: 23, row: 0, column: 0 }];
    game.shotsPlayer = [makeShot(game, 480, 220), makeShot(game, 480, 220), makeShot(game, 480, 220)];
    game.transitionTime = 0;
    const events = stepGame(game, DT);
    assert.equal(game.kills, kill);
    assert.equal(events.filter((event) => event.type === "alien").length, 1);
    if (events.some((event) => event.type === "upgrade")) upgrades.push(kill);
  }
  assert.deepEqual(upgrades, [6, 18, 36]);
  assert.equal(game.weaponTier, 4);
  assert.equal(game.score, 4000);
});

test("losing and retrying rolls back this mission's rewards while keeping earlier rescues", () => {
  const game = playingGame("cadet", 2);
  const checkpoint = structuredClone(game.checkpoint);
  game.score = 500;
  game.kills = 40;
  game.weaponTier = 4;
  game.shots = 88;
  game.shield = 0;
  game.lives = 1;
  game.shotsEnemy = [makeShot(game, game.playerX, WORLD.shipY)];
  const events = stepGame(game, DT);
  assert.equal(game.phase, "lost");
  assert.equal(events.filter((event) => event.type === "lose").length, 1);
  assert.deepEqual(stepGame(game, 30), []);
  retryLevel(game);
  assert.equal(game.phase, "playing");
  assert.equal(game.level, 2);
  assert.equal(game.score, checkpoint.score);
  assert.equal(game.kills, checkpoint.kills);
  assert.equal(game.shots, checkpoint.shots);
  assert.equal(game.weaponTier, 3);
  assert.deepEqual(game.rescued, ["Nelly", "Logan"]);
  assert.equal(game.lives, 5);
  assert.equal(game.shield, 2);
  assert.equal(game.wave, 0);
  assert.equal(game.shotsEnemy.length, 0);
  const snapshot = structuredClone(game);
  retryLevel(game);
  assert.deepEqual(game, snapshot, "Retry cannot be used mid-mission to refill hearts");
});

test("the ship's collision boundary is generous and invulnerability prevents burst damage", () => {
  for (const extra of [0, 0.01]) {
    const game = playingGame();
    game.shield = 0;
    game.shotsEnemy = [makeShot(game, game.playerX + 20 + extra, WORLD.shipY)];
    stepGame(game, DT);
    assert.equal(game.lives, extra === 0 ? 4 : 5);
  }
  const game = playingGame();
  game.shield = 0;
  game.shotsEnemy = Array.from({ length: 6 }, () => makeShot(game, game.playerX, WORLD.shipY));
  assert.equal(stepGame(game, DT).filter((event) => event.type === "hit").length, 1);
  assert.equal(game.lives, 4);
  game.shotsEnemy = [makeShot(game, game.playerX, WORLD.shipY - 50, { vy: 12000 })];
  stepGame(game, DT);
  assert.equal(game.lives, 4, "A fast swept bullet cannot bypass invulnerability");
  advance(game, 1.7);
  game.shotsEnemy = [makeShot(game, game.playerX, WORLD.shipY - 50, { vy: 12000 })];
  stepGame(game, DT);
  assert.equal(game.lives, 3, "A fast bullet crossing between frames still collides");
});

test("the launch shield absorbs shots and expires after two seconds", () => {
  const game = playingGame();
  game.shotsEnemy = [makeShot(game, game.playerX, WORLD.shipY)];
  stepGame(game, DT);
  assert.equal(game.lives, 5);
  advance(game, 2);
  assert.equal(game.shield, 0);
  game.shotsEnemy = [makeShot(game, game.playerX, WORLD.shipY)];
  stepGame(game, DT);
  assert.equal(game.lives, 4);
});

for (const phase of ["ready", "paused", "rescued", "lost", "won"] satisfies Phase[]) {
  test(`${phase}: the game, timers, and ship remain frozen`, () => {
    const game = playingGame();
    advance(game, 1);
    game.phase = phase;
    const snapshot = structuredClone(game);
    assert.deepEqual(stepGame(game, 30), []);
    moveShip(game, 100);
    assert.deepEqual(game, snapshot);
  });
}

test("fixed updates yield identical state at 30, 60, and 120 frames per second", () => {
  const states = [30, 60, 120].map((rate) => {
    const game = playingGame();
    moveShip(game, 340);
    for (let i = 0; i < rate * 10; i++) stepGame(game, 1 / rate);
    return game;
  });
  assert.deepEqual(states[0], states[1]);
  assert.deepEqual(states[1], states[2]);
});

test("background backlog is bounded and invalid timings or touch coordinates do nothing", () => {
  const game = playingGame();
  const ordinary = structuredClone(game);
  assert.deepEqual(stepGame(game, 3600), stepGame(ordinary, 0.1));
  assert.deepEqual(game, ordinary);
  const snapshot = structuredClone(game);
  for (const value of [-1, 0, NaN, Infinity]) assert.deepEqual(stepGame(game, value), []);
  moveShip(game, NaN);
  moveShip(game, Infinity);
  assert.deepEqual(game, snapshot);
  moveShip(game, -1000);
  assert.equal(game.targetX, WORLD.shipMinX);
  stepGame(game, 0.1);
  assert.ok(game.playerX >= 480 - 92 - 1e-8, "The ship follows smoothly rather than teleporting");
  moveShip(game, 9999);
  assert.equal(game.targetX, WORLD.shipMaxX);
});

test("unlocked missions start with the correct family, blaster, and independent state", () => {
  for (let level = 0; level < 4; level++) {
    const game = createGame("cadet", 1, level);
    assert.equal(game.level, level);
    assert.equal(game.weaponTier, level + 1);
    assert.equal(game.phase, "ready");
    assert.deepEqual(game.rescued, LEVELS.slice(0, level).map((mission) => mission.rescue));
    assert.equal(game.score, 0);
    assert.equal(game.kills, 0);
  }
  assert.equal(createGame("cadet", 1, Infinity).level, 0);
  assert.equal(createGame("cadet", 1, 90).level, 3);
  assert.equal(createGame("cadet", 1, -8).level, 0);
  const first = createGame();
  first.aliens.pop();
  assert.equal(createGame().aliens.length, 12);
});

test("extended play bounds formations, bullets, and effects for low-powered tablets", () => {
  const game = playingGame("ace", 3);
  game.shield = 1000;
  moveShip(game, WORLD.shipMinX);
  for (let frame = 0; frame < 60 * 180; frame++) {
    stepGame(game, 1 / 60);
    assert.ok(game.shotsEnemy.length <= 28);
    assert.ok(game.shotsPlayer.length <= 92);
    assert.ok(game.effects.length <= 48);
    for (const alien of game.aliens) {
      assert.ok(alien.y <= 360);
      assert.ok(alien.x >= 61 && alien.x <= 899);
    }
    for (const shot of [...game.shotsPlayer, ...game.shotsEnemy]) {
      assert.ok(shot.x >= -32 && shot.x <= 992);
      assert.ok(shot.y >= -32 && shot.y <= WORLD.controlTop + 18);
    }
  }
  assert.ok(game.elapsed > 100, "The test covers sustained active play");
});
