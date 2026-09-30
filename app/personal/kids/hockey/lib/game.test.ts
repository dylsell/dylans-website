import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceRound,
  canShoot,
  createGame,
  shoot,
  stepGame,
} from "./game";
import type { Game, GameEvent } from "./game";
import { resolveShot } from "./game";
import type { Difficulty, Phase } from "./types";
import { WORLD } from "./types";

function playingGame(difficulty: Difficulty = "rookie"): Game {
  const game = createGame(difficulty);
  game.phase = "playing";
  return game;
}

function advanceUntil(game: Game, done: () => boolean): GameEvent[] {
  const events: GameEvent[] = [];
  for (let frame = 0; frame < 200; frame++) {
    events.push(...stepGame(game, 0.05));
    if (done()) return events;
  }
  assert.fail("The shot did not settle within ten seconds of game time");
}

function aimAtOpenCorner(game: Game) {
  game.aimX = game.goalieX >= 550 ? 430 : 670;
  game.aimY = 235;
}

for (const difficulty of ["rookie", "allstar"] as const) {
  test(`${difficulty}: nine goals complete three rounds and award the cup once`, () => {
    const game = playingGame(difficulty);
    const allEvents: GameEvent[] = [];

    for (let round = 0; round < 3; round++) {
      assert.equal(game.round, round);
      assert.equal(game.goals, 0);
      assert.equal(game.phase, "playing");

      for (let goal = 1; goal <= 3; goal++) {
        aimAtOpenCorner(game);
        game.charge = goal === 3 ? 1 : 0;
        assert.equal(shoot(game), true);
        const events = advanceUntil(game, () => game.flight === null);
        allEvents.push(...events);

        assert.equal(events.filter((event) => event.type === "goal").length, 1);
        assert.equal(game.goals, goal);
        assert.equal(game.totalGoals, round * 3 + goal);
        assert.equal(events[0].hatTrick, goal === 3);
        assert.equal(events[0].power, goal === 3);
        assert.equal(game.phase, goal < 3 ? "playing" : round < 2 ? "round" : "won");
      }

      assert.equal(canShoot(game), false);
      if (round < 2) {
        advanceRound(game);
        assert.equal(game.result, null);
        assert.equal(game.hatTrick, false);
        assert.equal(game.celebration, 0);
        assert.equal(canShoot(game), true);
      }
    }

    assert.equal(game.shots, 9);
    assert.equal(game.totalGoals, 9);
    assert.equal(game.bestStreak, 9);
    assert.equal(game.powerGoals, 3);
    assert.equal(allEvents.filter((event) => event.type === "round").length, 2);
    assert.equal(allEvents.filter((event) => event.type === "win").length, 1);

    const won = structuredClone(game);
    assert.deepEqual(stepGame(game, 10), []);
    advanceRound(game);
    assert.deepEqual(game, won, "A finished cup must stay finished");
  });
}

test("one shot scores once while its celebration and cooldown finish", () => {
  const game = playingGame();
  aimAtOpenCorner(game);
  assert.equal(shoot(game), true);
  const flight = game.flight;
  const events = advanceUntil(game, () => game.result !== null);
  assert.equal(game.result, "goal");
  assert.equal(game.totalGoals, 1);
  assert.equal(canShoot(game), false);
  assert.equal(shoot(game), false);
  assert.equal(game.flight, flight);
  assert.equal(game.shots, 1);

  events.push(...advanceUntil(game, () => canShoot(game)));
  for (let frame = 0; frame < 100; frame++) events.push(...stepGame(game, 0.05));
  assert.deepEqual(events.map((event) => event.type), ["goal"]);
  assert.equal(game.totalGoals, 1);
  assert.equal(game.goals, 1);
  assert.equal(game.streak, 1);
  assert.equal(game.flight, null);
});

test("charging caps at full power and cannot launch or charge a second puck in flight", () => {
  const game = playingGame();
  game.charging = true;
  for (let frame = 0; frame < 30; frame++) stepGame(game, 0.05);
  assert.equal(game.charge, 1);
  assert.equal(shoot(game), true);
  assert.equal(game.flight?.power, 1);
  assert.equal(game.charge, 0);
  assert.equal(game.charging, false);
  assert.equal(canShoot(game), false);

  const flight = game.flight;
  game.charging = true;
  stepGame(game, 0.05);
  assert.equal(game.charge, 0);
  assert.equal(shoot(game), false);
  assert.equal(game.charging, false);
  assert.equal(game.flight, flight);
  assert.equal(game.shots, 1);
});

test("cooldown blocks charging and shooting until the previous puck clears", () => {
  const game = playingGame();
  aimAtOpenCorner(game);
  shoot(game);
  advanceUntil(game, () => game.result !== null);
  game.charging = true;
  stepGame(game, 0.05);
  assert.equal(game.charge, 0);
  assert.equal(shoot(game), false);
  advanceUntil(game, () => canShoot(game));
  assert.equal(shoot(game), true);
  assert.equal(game.shots, 2);
});

for (const phase of ["lobby", "paused", "round", "won"] satisfies Phase[]) {
  test(`${phase} prevents simulation and shooting`, () => {
    const game = playingGame();
    game.phase = phase;
    game.charging = true;
    game.charge = 0.5;
    const snapshot = structuredClone(game);
    assert.deepEqual(stepGame(game, 0.05), []);
    assert.deepEqual(game, snapshot);
    assert.equal(canShoot(game), false);
    assert.equal(shoot(game), false);
    assert.equal(game.shots, 0);
    assert.equal(game.flight, null);
    assert.equal(game.charging, false);
    assert.equal(game.charge, 0);
  });
}

test("pausing freezes an airborne puck and resumes the same shot", () => {
  const game = playingGame();
  aimAtOpenCorner(game);
  shoot(game);
  stepGame(game, 0.05);
  game.phase = "paused";
  const snapshot = structuredClone(game);
  for (let frame = 0; frame < 100; frame++) assert.deepEqual(stepGame(game, 1), []);
  assert.deepEqual(game, snapshot);

  game.phase = "playing";
  const events = advanceUntil(game, () => game.flight === null);
  assert.equal(game.shots, 1);
  assert.equal(game.totalGoals, 1);
  assert.deepEqual(events.map((event) => event.type), ["goal"]);
});

test("posts and goalie reach distinguish accurate, high, and powered shots", () => {
  assert.equal(resolveShot(WORLD.netLeft + 11, 260, 550, 1, "rookie"), "post");
  assert.equal(resolveShot(WORLD.netRight - 11, 260, 550, 1, "rookie"), "post");
  assert.equal(resolveShot(430, WORLD.netTop + 8, 550, 1, "rookie"), "post");
  assert.equal(resolveShot(WORLD.netLeft + 12, 235, 550, 0, "rookie"), "goal");
  assert.equal(resolveShot(550, 280, 550, 1, "rookie"), "save");
  assert.equal(resolveShot(590, 280, 550, 0, "rookie"), "save");
  assert.equal(resolveShot(590, 280, 550, 0.7, "rookie"), "goal");
  assert.equal(resolveShot(598, 280, 550, 0, "allstar"), "save");
  assert.equal(resolveShot(598, 280, 550, 0.7, "allstar"), "goal");
  assert.equal(resolveShot(580, 280, 550, 0, "rookie"), "save");
  assert.equal(resolveShot(580, 235, 550, 0, "rookie"), "goal");
});

for (const outcome of ["save", "post"] as const) {
  test(`${outcome} breaks a scoring streak without erasing its record`, () => {
    const game = playingGame();
    aimAtOpenCorner(game);
    game.charge = 1;
    shoot(game);
    advanceUntil(game, () => game.flight === null);
    assert.equal(game.streak, 1);
    assert.equal(game.powerGoals, 1);

    game.aimX = outcome === "save" ? game.goalieX : WORLD.netLeft;
    game.aimY = 280;
    shoot(game);
    const events = advanceUntil(game, () => game.flight === null);
    assert.deepEqual(events.map((event) => event.type), [outcome]);
    assert.equal(game.streak, 0);
    assert.equal(game.bestStreak, 1);
    assert.equal(game.goals, 1);
    assert.equal(game.totalGoals, 1);
    assert.equal(game.powerGoals, 1);
    assert.equal(game.shots, 2);
    assert.equal(canShoot(game), true);
  });
}

test("a huge elapsed frame advances charging, flight, and cooldown by at most 50ms", () => {
  const charging = playingGame();
  charging.charging = true;
  const airborne = playingGame();
  aimAtOpenCorner(airborne);
  shoot(airborne);
  const celebrating = playingGame();
  aimAtOpenCorner(celebrating);
  shoot(celebrating);
  advanceUntil(celebrating, () => celebrating.result !== null);

  for (const initial of [charging, airborne, celebrating]) {
    const ordinary = structuredClone(initial);
    const delayed = structuredClone(initial);
    assert.deepEqual(stepGame(delayed, 3_600), stepGame(ordinary, 0.05));
    assert.deepEqual(delayed, ordinary);
    assert.equal(delayed.totalGoals, initial.totalGoals);
  }
});

test("negative elapsed time cannot reverse the game clock or advance a shot", () => {
  const game = playingGame();
  aimAtOpenCorner(game);
  shoot(game);
  const snapshot = structuredClone(game);
  assert.deepEqual(stepGame(game, -1), []);
  assert.deepEqual(game, snapshot);
});
