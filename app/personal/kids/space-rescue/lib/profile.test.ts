import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PROFILE, PROFILE_KEY, parseProfile } from "./profile";
import type { Profile } from "./profile";

const saved: Profile = {
  bestScore: 14500,
  totalRescues: 17,
  missions: 8,
  victories: 3,
  furthestLevel: 3,
  muted: true,
  difficulty: "ace",
};

test("space rescue progress and preferences survive a storage round trip", () => {
  assert.equal(PROFILE_KEY, "bradley-space-rescue-v1");
  assert.deepEqual(parseProfile(JSON.stringify(saved)), saved);
  assert.deepEqual(parseProfile(JSON.stringify({ ...saved, muted: false, difficulty: "cadet" })), {
    ...saved,
    muted: false,
    difficulty: "cadet",
  });
});

test("missing, corrupt, and non-object storage produces a fresh default profile", () => {
  for (const raw of [null, "", "{broken", "null", "false", "3", '"profile"', "[]", "[1,2,3]"]) {
    const profile = parseProfile(raw);
    assert.deepEqual(profile, DEFAULT_PROFILE, String(raw));
    assert.notEqual(profile, DEFAULT_PROFILE);
  }
  const profile = parseProfile(null);
  profile.bestScore = 20;
  assert.equal(parseProfile(null).bestScore, 0);
});

test("invalid counters recover independently without discarding valid progress", () => {
  const fields = ["bestScore", "totalRescues", "missions", "victories", "furthestLevel"] as const;
  for (const field of fields) {
    for (const invalid of [-1, -5.5, 0.5, "2", true, null, [], {}, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN]) {
      assert.deepEqual(parseProfile(JSON.stringify({ ...saved, [field]: invalid })), {
        ...saved,
        [field]: 0,
      }, `${field}: ${String(invalid)}`);
    }
  }
});

test("numeric overflow is rejected and negative zero is normalized", () => {
  assert.deepEqual(parseProfile('{"bestScore":1e400,"missions":2}'), {
    ...DEFAULT_PROFILE,
    missions: 2,
  });
  assert.deepEqual(parseProfile('{"bestScore":NaN}'), DEFAULT_PROFILE);
  assert.equal(parseProfile('{"bestScore":-0}').bestScore, 0);
});

test("lifetime counters accept safe integers and furthest level is restricted to four levels", () => {
  const maximums: Profile = {
    ...saved,
    bestScore: Number.MAX_SAFE_INTEGER,
    totalRescues: Number.MAX_SAFE_INTEGER,
    missions: Number.MAX_SAFE_INTEGER,
    victories: Number.MAX_SAFE_INTEGER,
  };
  assert.deepEqual(parseProfile(JSON.stringify(maximums)), maximums);
  for (const level of [0, 1, 2, 3]) {
    assert.equal(parseProfile(JSON.stringify({ furthestLevel: level })).furthestLevel, level);
  }
  assert.equal(parseProfile('{"furthestLevel":4}').furthestLevel, 0);
  assert.equal(parseProfile('{"furthestLevel":999}').furthestLevel, 0);
});

test("partial profiles preserve valid fields while ignoring extras and invalid preferences", () => {
  for (const muted of ["true", "false", 1, 0, null, [], {}]) {
    assert.equal(parseProfile(JSON.stringify({ muted })).muted, false);
  }
  for (const difficulty of ["pro", "ACE", "", true, 1, null, [], {}]) {
    assert.equal(parseProfile(JSON.stringify({ difficulty })).difficulty, "cadet");
  }
  assert.deepEqual(parseProfile('{"totalRescues":5,"unknown":"ignored"}'), {
    ...DEFAULT_PROFILE,
    totalRescues: 5,
  });
  assert.deepEqual(parseProfile('{"__proto__":{"bestScore":999}}'), DEFAULT_PROFILE);
});
