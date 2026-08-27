import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { cashoutJacareRound, createJacareRound, generateCrashPoint, multiplierAt } from '../../shared/games/jacareCrash/CrashEngine.ts';

void test('crash point generator stays within valid range', () => {
  assert.equal(generateCrashPoint(() => 0), 1);
  assert.equal(generateCrashPoint(() => 999_999), 25);
  assert.equal(generateCrashPoint(() => 500_000) >= 1.01, true);
});

void test('cashout before and after crash is server decided', () => {
  const start = createJacareRound(
    { roundId: 'round_123456789', userId: 't2_test', bet: 100, now: 1000 },
    () => 500_000
  );
  const before = cashoutJacareRound(start.round, start.round.startedAt + 500);
  assert.equal(before.status, 'cashed-out');
  assert.equal(before.reward > 100, true);

  const after = cashoutJacareRound(start.round, start.round.crashAt + 1);
  assert.equal(after.status, 'crashed');
  assert.equal(after.reward, 0);
});

void test('multiplier curve is monotonic', () => {
  assert.equal(multiplierAt(1000, 1000), 1);
  assert.equal(multiplierAt(1000, 2050), 2);
  assert.equal(multiplierAt(1000, 27_000), 25);
});
