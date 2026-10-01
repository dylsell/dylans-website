import assert from "node:assert/strict";
import test from "node:test";
import { createGame, jump, PIXELS_PER_METER, startGame, stepGame, TOTAL_DISTANCE, WORLD } from "./game";
import type { Difficulty, GameEvent, GameState, Mode, Obstacle, Phase } from "./game";

function playingGame(mode: Mode = "trail", difficulty: Difficulty = "explorer") {
  const game = createGame(mode, difficulty, () => 0.42);
  startGame(game);
  return game;
}

function quietGame() {
  const game = playingGame();
  game.nextObstacleAt = Number.POSITIVE_INFINITY;
  game.nextShieldAt = Number.POSITIVE_INFINITY;
  game.pickups = [];
  return game;
}

function advance(game: GameState, seconds: number, fps = 60) {
  const events: GameEvent[] = [];
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) events.push(...stepGame(game, 1 / fps));
  return events;
}

function obstacle(id: number, x: number = WORLD.playerX): Obstacle {
  return { id, x, w: 80, h: 60, kind: "log", passed: false };
}

function pilot(game: GameState, fps = 60, seconds = 100) {
  const events: GameEvent[] = [];
  for (let frame = 0; frame < seconds * fps && game.phase === "playing"; frame++) {
    const next = game.obstacles.find((item) => !item.passed && item.x + item.w > WORLD.playerX);
    if (game.grounded && next && next.x - WORLD.playerX < 110) jump(game);
    events.push(...stepGame(game, 1 / fps));
  }
  return events;
}

for (const difficulty of ["explorer", "ranger"] as const) {
  test(`${difficulty}: a player can finish the entire trail using only single jumps`, () => {
    const game = playingGame("trail", difficulty);
    const events = pilot(game);
    assert.equal(game.phase, "finished");
    assert.equal(game.outcome, "complete");
    assert.equal(game.distance, TOTAL_DISTANCE);
    assert.equal(game.hearts, 3, "Every generated obstacle must be clearable without losing a heart");
    assert.ok(game.stars >= 12);
    assert.ok(game.bestCombo >= 5);
    assert.ok(game.elapsed > 35 && game.elapsed < 65);
    assert.equal(events.filter((event) => event.type === "checkpoint").length, 2);
    assert.equal(events.filter((event) => event.type === "finish").length, 1);
    assert.equal(events.filter((event) => event.type === "hit").length, 0);
    const snapshot = structuredClone(game);
    assert.deepEqual(advance(game, 3), []);
    assert.equal(jump(game), false);
    startGame(game);
    assert.deepEqual(game, snapshot);
  });
}

test("three separate collisions end a run once; touching the same obstacle cannot cost more hearts", () => {
  const game = quietGame();
  const events: GameEvent[] = [];
  for (let hit = 0; hit < 3; hit++) {
    game.obstacles = [obstacle(hit)];
    events.push(...stepGame(game, 1 / 60));
    assert.equal(game.hearts, 2 - hit);
    events.push(...advance(game, 2));
  }
  assert.equal(game.phase, "finished");
  assert.equal(game.outcome, "caught");
  assert.equal(events.filter((event) => event.type === "hit").length, 3);
  assert.equal(events.filter((event) => event.type === "finish").length, 1);
  assert.deepEqual(stepGame(game, 100), []);
});

test("recovery time protects Bradley even when a second obstacle overlaps", () => {
  const game = quietGame();
  game.combo = 8;
  game.bestCombo = 8;
  game.obstacles = [obstacle(1)];
  stepGame(game, 1 / 60);
  assert.equal(game.combo, 0);
  assert.equal(game.bestCombo, 8);
  game.obstacles.push(obstacle(2));
  const events = advance(game, 1);
  assert.equal(game.hearts, 2);
  assert.equal(events.filter((event) => event.type === "hit").length, 0);
  assert.ok(game.invulnerable > 0);
});

test("a shield collected on a collision frame protects the player and gives one persistent smash bonus", () => {
  const game = quietGame();
  game.obstacles = [obstacle(1)];
  game.pickups = [{ id: 2, kind: "shield", x: WORLD.playerX, y: 355 }];
  const events = stepGame(game, 1 / 120);
  assert.deepEqual(events.map((event) => event.type), ["shield", "smash"]);
  assert.equal(game.hearts, 3);
  assert.equal(game.obstacles.length, 0);
  assert.ok(game.shield > 6.9);
  advance(game, 8);
  assert.equal(game.shield, 0);
  assert.equal(game.score, Math.floor(game.distance) + 50);
});

test("star rewards and five-star streak bonuses survive future distance updates", () => {
  const game = quietGame();
  for (let star = 0; star < 5; star++) {
    game.pickups.push({ id: star, kind: "star", x: WORLD.playerX, y: 355 });
  }
  const events = stepGame(game, 1 / 120);
  assert.equal(events.filter((event) => event.type === "star").length, 5);
  assert.equal(game.stars, 5);
  assert.equal(game.combo, 5);
  assert.equal(game.bestCombo, 5);
  advance(game, 5);
  assert.equal(game.score, Math.floor(game.distance) + 150);
  assert.equal(game.stars, 5, "A star is collected only once");
  game.pickups.push({ id: 6, kind: "star", x: -50, y: 150 });
  stepGame(game, 1 / 120);
  assert.equal(game.combo, 5, "Missing a star is allowed; only getting hit breaks a streak");
});

test("star events retain an earned streak milestone when other stars or a collision occur in the same frame", () => {
  const game = quietGame();
  game.combo = 4;
  game.bestCombo = 4;
  game.pickups = [
    { id: 1, kind: "star", x: WORLD.playerX, y: 355 },
    { id: 2, kind: "star", x: WORLD.playerX + 10, y: 355 },
  ];
  game.obstacles = [obstacle(3)];
  const events = stepGame(game, 1 / 60);
  assert.deepEqual(events.filter((event) => event.type === "star").map((event) => event.combo), [5, 6]);
  assert.equal(game.combo, 0);
  assert.equal(game.bestCombo, 6);
  assert.equal(game.stars, 2);
  assert.equal(game.score, 75);
});

test("forgiving collision bounds allow a glancing edge and a nearly cleared log", () => {
  const game = quietGame();
  game.obstacles = [obstacle(1, WORLD.playerX + WORLD.playerWidth / 2 - 2)];
  stepGame(game, 1 / 120);
  assert.equal(game.hearts, 3);
  game.obstacles = [obstacle(2)];
  game.y = WORLD.groundY - 60 + 10;
  game.grounded = false;
  stepGame(game, 1 / 120);
  assert.equal(game.hearts, 3);
  game.y = WORLD.groundY;
  stepGame(game, 1 / 120);
  assert.equal(game.hearts, 2, "A clear body collision still counts");
});

test("jump, double jump, and landing are responsive, with no third midair jump", () => {
  const game = quietGame();
  assert.equal(jump(game), true);
  assert.equal(game.jumps, 1);
  assert.equal(game.grounded, false);
  advance(game, 0.2);
  const firstHeight = game.y;
  assert.equal(jump(game), true);
  assert.equal(game.jumps, 2);
  assert.equal(game.spin, 0.5);
  const secondVelocity = game.vy;
  assert.equal(jump(game), false);
  assert.equal(game.vy, secondVelocity);
  advance(game, 0.2);
  assert.ok(game.y < firstHeight);
  advance(game, 2);
  assert.equal(game.y, WORLD.groundY);
  assert.equal(game.grounded, true);
  assert.equal(game.jumps, 0);
  assert.equal(game.spin, 0);
  assert.equal(game.vy, 0);
});

test("an early landing tap is buffered once, while stale taps expire", () => {
  const game = quietGame();
  game.grounded = false;
  game.jumps = 2;
  game.y = WORLD.groundY - 4;
  game.vy = 500;
  assert.equal(jump(game), false);
  const events = advance(game, 0.1);
  assert.equal(events.filter((event) => event.type === "jump").length, 1);
  assert.equal(game.jumps, 1);
  assert.ok(game.y < WORLD.groundY - 20);
  advance(game, 2);
  assert.equal(game.grounded, true);
  assert.equal(game.jumpBuffer, 0);
});

for (const phase of ["ready", "paused", "finished"] satisfies Phase[]) {
  test(`${phase} freezes simulation, input, and active power timers`, () => {
    const game = quietGame();
    jump(game);
    game.shield = 3;
    game.phase = phase;
    const snapshot = structuredClone(game);
    assert.deepEqual(stepGame(game, 0.1), []);
    assert.equal(jump(game), false);
    assert.deepEqual(game, snapshot);
  });
}

test("paused air time resumes from the same place without consuming the shield", () => {
  const game = quietGame();
  jump(game);
  advance(game, 0.2);
  const reference = structuredClone(game);
  game.phase = "paused";
  advance(game, 10);
  game.phase = "playing";
  advance(game, 0.2);
  advance(reference, 0.2);
  assert.deepEqual(game, reference);
});

test("checkpoints restore one heart and region progression differs between trail and endless", () => {
  const game = quietGame();
  game.hearts = 1;
  game.distance = 149.99;
  const events = stepGame(game, 1 / 60);
  assert.equal(game.region, 1);
  assert.equal(game.hearts, 2);
  assert.deepEqual(events.filter((event) => event.type === "checkpoint"), [{ type: "checkpoint", value: 1, region: 1 }]);
  game.distance = 299.99;
  stepGame(game, 1 / 60);
  assert.equal(game.region, 2);
  assert.equal(game.hearts, 3);
  game.mode = "endless";
  game.distance = 449.99;
  stepGame(game, 1 / 60);
  assert.equal(game.phase, "playing");
  assert.equal(game.region, 0);
  assert.equal(game.hearts, 3);
  assert.equal(game.outcome, null);
});

test("endless keeps a bounded speed and live entity count beyond the trail finish", () => {
  const game = playingGame("endless", "ranger");
  const events = pilot(game, 60, 180);
  assert.equal(game.phase, "playing");
  assert.ok(game.distance > TOTAL_DISTANCE * 4);
  assert.equal(game.speed, 410);
  assert.equal(events.filter((event) => event.type === "finish").length, 0);
  assert.ok(game.obstacles.length < 5);
  assert.ok(game.pickups.length < 35);
});

test("30, 60, and 120 fps produce identical physics, random spawns, points, and events", () => {
  const outcomes = [30, 60, 120].map((fps) => {
    const game = playingGame("endless");
    // Protection lets the timing comparison include many spawns and shield effects.
    game.shield = 100;
    jump(game);
    const events = advance(game, 10, fps);
    jump(game);
    events.push(...advance(game, 10, fps));
    return { game, events };
  });
  assert.deepEqual(outcomes[0], outcomes[1]);
  assert.deepEqual(outcomes[1], outcomes[2]);
});

test("non-finite frame time is ignored and a delayed frame advances at most one tenth of a second", () => {
  const game = playingGame();
  const snapshot = structuredClone(game);
  for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.deepEqual(stepGame(game, dt), []);
    assert.deepEqual(game, snapshot);
  }
  const delayed = structuredClone(game);
  assert.deepEqual(stepGame(game, 0.1), stepGame(delayed, 999));
  assert.deepEqual(game, delayed);
  assert.ok(game.distance < 1);
});

test("generated obstacles allow a full warning and a landing gap across random courses", () => {
  for (const difficulty of ["explorer", "ranger"] as const) {
    for (const seed of [0, 0.2, 0.8, 1, Number.NaN]) {
      const game = createGame("trail", difficulty, () => seed);
      startGame(game);
      let firstArrival = 0;
      for (let frame = 0; frame < 70 * 60 && game.phase === "playing"; frame++) {
        const next = game.obstacles.find((item) => !item.passed && item.x + item.w > WORLD.playerX);
        if (game.grounded && next && next.x - WORLD.playerX < 110) jump(game);
        stepGame(game, 1 / 60);
        for (let i = 1; i < game.obstacles.length; i++) {
          const previous = game.obstacles[i - 1];
          const current = game.obstacles[i];
          assert.ok((current.x - previous.x - previous.w) / game.speed > 1.2);
        }
        if (firstArrival === 0 && game.obstacles.some((item) => item.x <= WORLD.playerX)) firstArrival = game.elapsed;
      }
      assert.equal(game.outcome, "complete");
      assert.equal(game.hearts, 3);
      assert.ok(firstArrival > 4.4 && firstArrival < 5.5);
    }
  }
});

test("a new game resets run state without sharing arrays or needing a page reload", () => {
  const previous = playingGame();
  advance(previous, 6);
  const fresh = createGame();
  assert.equal(fresh.phase, "ready");
  assert.equal(fresh.mode, "trail");
  assert.equal(fresh.difficulty, "explorer");
  assert.equal(fresh.hearts, 3);
  assert.equal(fresh.score, 0);
  assert.equal(fresh.distance, 0);
  assert.equal(fresh.outcome, null);
  assert.notEqual(previous.obstacles, fresh.obstacles);
  assert.notEqual(previous.pickups, fresh.pickups);
  assert.equal(PIXELS_PER_METER, 32);
});
