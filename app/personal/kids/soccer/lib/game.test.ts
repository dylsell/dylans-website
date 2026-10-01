import assert from "node:assert/strict";
import test from "node:test";
import {
  createGame,
  getBallPosition,
  getSaveRadius,
  moveKeeper,
  startGame,
  stepGame,
  TOTAL_SHOTS,
  WIN_SAVES,
  WORLD,
} from "./game";
import type { Difficulty, GameEvent, GameState, Phase } from "./game";

function playingGame(difficulty: Difficulty = "rookie") {
  const game = createGame(difficulty, () => 0);
  startGame(game);
  return game;
}

function advanceUntil(game: GameState, done: () => boolean): GameEvent[] {
  const events: GameEvent[] = [];
  for (let frame = 0; frame < 1_000; frame++) {
    events.push(...stepGame(game, 0.02));
    if (done()) return events;
  }
  assert.fail("The game did not reach the expected state within twenty seconds");
}

for (const difficulty of ["rookie", "pro"] as const) {
  test(`${difficulty}: ten saves complete one match and finish exactly once`, () => {
    const game = playingGame(difficulty);
    const allEvents: GameEvent[] = [];
    const firstFlight = game.flightDuration;
    for (let shot = 0; shot < TOTAL_SHOTS; shot++) {
      assert.equal(game.shotIndex, shot);
      assert.equal(game.stage, "windup");
      moveKeeper(game, game.targetX, game.targetY);
      allEvents.push(...advanceUntil(game, () => game.stage === "result"));
      assert.equal(game.saves, shot + 1);
      assert.equal(game.goals, 0);
      assert.equal(game.lastResult, "save");
      assert.equal(game.lastReaction, 0, "Being ready in the right place counts as anticipation");
      assert.equal(game.results.length, shot + 1);
      allEvents.push(...advanceUntil(game, () => game.stage === "windup" || game.phase === "finished"));
    }
    assert.equal(game.phase, "finished");
    assert.equal(game.saves >= WIN_SAVES, true);
    assert.equal(game.bestStreak, TOTAL_SHOTS);
    assert.ok(game.flightDuration < firstFlight);
    assert.equal(allEvents.filter((event) => event.type === "kick").length, TOTAL_SHOTS);
    assert.equal(allEvents.filter((event) => event.type === "save").length, TOTAL_SHOTS);
    assert.equal(allEvents.filter((event) => event.type === "finish").length, 1);
    assert.equal(allEvents.filter((event) => event.type === "goal").length, 0);
    const completed = structuredClone(game);
    assert.deepEqual(stepGame(game, 100), []);
    startGame(game);
    moveKeeper(game, 500, 500);
    assert.deepEqual(game, completed);
  });
}

test("a missed shot breaks the current save streak while retaining the record", () => {
  const game = playingGame();
  moveKeeper(game, game.targetX, game.targetY);
  advanceUntil(game, () => game.stage === "result");
  advanceUntil(game, () => game.stage === "windup");
  moveKeeper(game, WORLD.goalRight, WORLD.goalBottom);
  const events = advanceUntil(game, () => game.stage === "result");
  assert.deepEqual(events.map((event) => event.type), ["kick", "goal"]);
  assert.equal(game.saves, 1);
  assert.equal(game.goals, 1);
  assert.equal(game.streak, 0);
  assert.equal(game.bestStreak, 1);
  assert.equal(game.lastReaction, null);
  assert.deepEqual(game.results, ["save", "goal"]);
  for (let frame = 0; frame < 20; frame++) {
    assert.deepEqual(stepGame(game, 0.02), []);
  }
  assert.equal(game.goals, 1, "A result cannot score more than once");
});

for (const difficulty of ["rookie", "pro"] as const) {
  test(`${difficulty}: a ball at the edge of glove reach is saved; one just outside scores`, () => {
    for (const distanceBeyondReach of [0, 0.01]) {
      const game = playingGame(difficulty);
      moveKeeper(game, game.targetX + getSaveRadius(game) + distanceBeyondReach, game.targetY);
      advanceUntil(game, () => game.stage === "result");
      assert.equal(game.lastResult, distanceBeyondReach === 0 ? "save" : "goal");
    }
  });
}

test("moving through the catch zone is insufficient if the gloves leave before arrival", () => {
  const game = playingGame();
  advanceUntil(game, () => game.stage === "flight");
  moveKeeper(game, game.targetX, game.targetY);
  moveKeeper(game, WORLD.goalRight, WORLD.goalBottom);
  advanceUntil(game, () => game.stage === "result");
  assert.equal(game.lastResult, "goal");
  assert.equal(game.lastReaction, null);
  assert.equal(game.bestReaction, null);
});

test("reaction time records the first arrival in the catch zone after the kick", () => {
  const game = playingGame();
  advanceUntil(game, () => game.stage === "flight");
  for (let frame = 0; frame < 5; frame++) stepGame(game, 0.1);
  const reaction = game.elapsed;
  moveKeeper(game, game.targetX, game.targetY);
  stepGame(game, 0.1);
  moveKeeper(game, game.targetX + 5, game.targetY);
  advanceUntil(game, () => game.stage === "result");
  assert.ok(reaction >= 0.5 && reaction < 0.53);
  assert.equal(game.lastReaction, reaction);
  assert.equal(game.bestReaction, reaction);
});

for (const phase of ["ready", "paused", "finished"] satisfies Phase[]) {
  test(`${phase} prevents simulation and glove movement`, () => {
    const game = playingGame();
    advanceUntil(game, () => game.stage === "flight");
    game.phase = phase;
    const snapshot = structuredClone(game);
    assert.deepEqual(stepGame(game, 0.1), []);
    moveKeeper(game, 800, 400);
    assert.deepEqual(game, snapshot);
  });
}

test("pausing preserves an airborne shot and resumes without a second kick", () => {
  const game = playingGame();
  advanceUntil(game, () => game.stage === "flight");
  moveKeeper(game, game.targetX, game.targetY);
  stepGame(game, 0.1);
  game.phase = "paused";
  const snapshot = structuredClone(game);
  for (let frame = 0; frame < 30; frame++) assert.deepEqual(stepGame(game, 60), []);
  assert.deepEqual(game, snapshot);
  game.phase = "playing";
  assert.deepEqual(advanceUntil(game, () => game.stage === "result"), [{ type: "save" }]);
});

test("a delayed frame discards backlog and stage transitions retain only the frame remainder", () => {
  const ordinary = playingGame();
  ordinary.elapsed = ordinary.windupDuration - 0.03;
  const delayed = structuredClone(ordinary);
  assert.deepEqual(stepGame(delayed, 3_600), stepGame(ordinary, 0.1));
  assert.deepEqual(delayed, ordinary);
  assert.equal(delayed.stage, "flight");
  assert.ok(Math.abs(delayed.elapsed - 0.07) < 1e-9);
  assert.equal(delayed.results.length, 0);
});

test("negative, zero, and non-finite frame durations do not mutate the match", () => {
  const game = playingGame();
  const snapshot = structuredClone(game);
  for (const delta of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(stepGame(game, delta), []);
    assert.deepEqual(game, snapshot);
  }
});

test("touch coordinates stay inside the reachable goal and invalid inputs are ignored", () => {
  const game = playingGame();
  moveKeeper(game, -100, 1_000);
  assert.equal(game.keeperX, WORLD.goalLeft);
  assert.equal(game.keeperY, WORLD.goalBottom);
  moveKeeper(game, 1_000, -100);
  assert.equal(game.keeperX, WORLD.goalRight);
  assert.equal(game.keeperY, WORLD.goalTop);
  const snapshot = structuredClone(game);
  moveKeeper(game, Number.NaN, 200);
  moveKeeper(game, 400, Number.POSITIVE_INFINITY);
  assert.deepEqual(game, snapshot);
});

test("planned shots stay inside the posts and ball perspective ends exactly at the target", () => {
  let next = 0;
  const game = createGame("rookie", () => (next++ % 2));
  assert.equal(game.shotTargets.length, TOTAL_SHOTS);
  for (const target of game.shotTargets) {
    assert.ok(target.x >= WORLD.goalLeft + 40 && target.x <= WORLD.goalRight - 40);
    assert.ok(target.y >= WORLD.goalTop + 40 && target.y <= WORLD.goalBottom - 40);
  }
  assert.deepEqual(getBallPosition(game), { x: 480, y: 335, scale: 1, progress: 0 });
  game.stage = "flight";
  game.elapsed = game.flightDuration / 2;
  const middle = getBallPosition(game);
  assert.equal(middle.progress, 0.5);
  assert.ok(middle.scale > 1 && middle.scale < 4);
  game.elapsed = game.flightDuration;
  const arrival = getBallPosition(game);
  assert.ok(Math.abs(arrival.x - game.targetX) < 1e-9);
  assert.ok(Math.abs(arrival.y - game.targetY) < 1e-9);
  assert.equal(arrival.scale, 4);
  assert.equal(arrival.progress, 1);
  assert.ok(getSaveRadius(game) > getSaveRadius(createGame("pro")));
});
