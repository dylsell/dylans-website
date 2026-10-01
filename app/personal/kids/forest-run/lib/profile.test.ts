import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PROFILE, parseProfile } from "./profile";

test("old forest records survive without being mistaken for real distance", () => {
  assert.deepEqual(parseProfile(null, "760"), { ...DEFAULT_PROFILE, bestScore: 760 });
  assert.equal(parseProfile('{"bestScore":900,"bestDistance":421}', "760").bestScore, 900);
  assert.equal(parseProfile('{"bestScore":600,"bestDistance":421}', "760").bestDistance, 421);
});
test("corrupt storage and invalid counters cannot break or inflate progress", () => {
  for (const raw of [null, "broken", "[]", "false", "null", '"hello"']) {
    assert.deepEqual(parseProfile(raw), DEFAULT_PROFILE);
  }
  assert.deepEqual(parseProfile('{"bestScore":1e309,"bestDistance":-2,"runs":"100","trailWins":2.5,"muted":"true","mode":"wrong"}', "Infinity"), DEFAULT_PROFILE);
  assert.equal(parseProfile('{"totalStars":9007199254740992}').totalStars, 0);
});
test("preferences and valid new progress round-trip and are independent of defaults", () => {
  const profile = { ...DEFAULT_PROFILE, bestDistance: 450, bestScore: 900, bestRunStars: 16, bestCombo: 5, totalStars: 39, runs: 3, trailWins: 1, muted: true, mode: "endless", difficulty: "ranger" };
  assert.deepEqual(parseProfile(JSON.stringify(profile)), profile);
  const first = parseProfile(null);
  first.runs = 99;
  assert.equal(parseProfile(null).runs, 0);
});
