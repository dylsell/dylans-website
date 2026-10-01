import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PROFILE, PROFILE_KEY, parseProfile } from "./profile";
import type { Profile } from "./profile";

const saved: Profile = {
  careerSaves: 154,
  matches: 23,
  cups: 11,
  bestStreak: 8,
  bestScore: 9,
  muted: true,
};

test("valid progress and sound preference survive a storage round trip", () => {
  assert.equal(PROFILE_KEY, "bradley-soccer-profile-v1");
  assert.deepEqual(parseProfile(JSON.stringify(saved)), saved);
  assert.deepEqual(parseProfile(JSON.stringify({ ...saved, muted: false })), { ...saved, muted: false });
});

test("missing, corrupt, and non-object storage returns a fresh default profile", () => {
  for (const raw of [null, "", "{broken", "null", "false", "3", '"profile"', "[]", "[1,2,3]"]) {
    const parsed = parseProfile(raw);
    assert.deepEqual(parsed, DEFAULT_PROFILE, String(raw));
    assert.notEqual(parsed, DEFAULT_PROFILE);
  }
  const parsed = parseProfile(null);
  parsed.careerSaves = 9;
  assert.equal(parseProfile(null).careerSaves, 0);
});

test("invalid fields reset independently while valid progress is preserved", () => {
  const fields = ["careerSaves", "matches", "cups", "bestStreak", "bestScore"] as const;
  for (const field of fields) {
    for (const invalid of [-1, -5.5, 0.5, "2", true, null, [], {}, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN]) {
      assert.deepEqual(
        parseProfile(JSON.stringify({ ...saved, [field]: invalid })),
        { ...saved, [field]: 0 },
        `${field}: ${String(invalid)}`,
      );
    }
  }
});

test("numeric overflows and non-JSON NaN cannot enter a profile", () => {
  assert.equal(parseProfile('{"careerSaves":1e400,"matches":3}').careerSaves, 0);
  assert.equal(parseProfile('{"careerSaves":1e400,"matches":3}').matches, 3);
  assert.deepEqual(parseProfile('{"careerSaves":NaN}'), DEFAULT_PROFILE);
  assert.equal(parseProfile('{"careerSaves":-0}').careerSaves, 0);
});

test("match records are limited to ten shots while lifetime counters support safe integers", () => {
  const maximums = {
    careerSaves: Number.MAX_SAFE_INTEGER,
    matches: Number.MAX_SAFE_INTEGER,
    cups: Number.MAX_SAFE_INTEGER,
    bestStreak: 10,
    bestScore: 10,
    muted: false,
  };
  assert.deepEqual(parseProfile(JSON.stringify(maximums)), maximums);
  assert.deepEqual(parseProfile('{"bestStreak":11,"bestScore":11}'), DEFAULT_PROFILE);
});

test("partial profiles recover safely and only boolean true mutes sound", () => {
  for (const muted of ["true", "false", 1, 0, null, [], {}]) {
    assert.equal(parseProfile(JSON.stringify({ muted })).muted, false);
  }
  assert.deepEqual(parseProfile('{"careerSaves":5,"unknown":"ignored"}'), {
    ...DEFAULT_PROFILE,
    careerSaves: 5,
  });
  assert.deepEqual(parseProfile('{"__proto__":{"careerSaves":999}}'), DEFAULT_PROFILE);
});
