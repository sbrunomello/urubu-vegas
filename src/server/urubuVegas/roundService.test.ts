import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { createDefaultPlayer, emptyLeaderboards } from '../../shared/urubuVegas.ts';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { processUrubuzinhoRound } from './roundService.ts';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { processJacareCashout, processJacareStart, processOncinhaRound, processRouletteRound } from './roundService.ts';

const globalStats = {
  communityPlays: 0,
  largestRecordedWin: 0,
};

void test('same actionId returns stored snapshot without duplicating round', () => {
  const player = createDefaultPlayer('t2_test', 'tester', 1000);
  const first = processUrubuzinhoRound({
    request: { actionId: 'round_123456789', bet: 50 },
    player,
    existingSnapshot: null,
    randomInt: () => 0,
    now: 2000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const replay = processUrubuzinhoRound({
    request: { actionId: 'round_123456789', bet: 50 },
    player: first.snapshot.player,
    existingSnapshot: first.snapshot,
    randomInt: () => 7,
    now: 3000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });

  assert.equal(replay.ok, true);
  if (!replay.ok) return;
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.response.result, first.response.result);
  assert.equal(replay.response.player.totalRounds, first.response.player.totalRounds);
});

void test('invalid request and insufficient balance fail before RNG', () => {
  const player = createDefaultPlayer('t2_test', 'tester', 1000);
  const invalid = processUrubuzinhoRound({
    request: { actionId: 'bad id', bet: 50 },
    player,
    existingSnapshot: null,
    randomInt: () => 0,
    now: 2000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.status, 400);

  const broke = processUrubuzinhoRound({
    request: { actionId: 'round_123456789', bet: 500 },
    player: { ...player, balance: 10 },
    existingSnapshot: null,
    randomInt: () => 0,
    now: 2000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(broke.ok, false);
  assert.equal(broke.status, 402);
});

void test('Oncinha service updates per-game stats and replays idempotently', () => {
  const player = createDefaultPlayer('t2_test', 'tester', 1000);
  const first = processOncinhaRound({
    request: { actionId: 'oncinha_123456789', bet: 50 },
    player,
    existingSnapshot: null,
    randomInt: () => 0,
    now: 2000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.response.player.statsByGame['oncinha-777'].plays, 1);

  const replay = processOncinhaRound({
    request: { actionId: 'oncinha_123456789', bet: 50 },
    player: first.snapshot.player,
    existingSnapshot: first.snapshot,
    randomInt: () => 9,
    now: 3000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(replay.ok, true);
  if (!replay.ok) return;
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.response.result, first.response.result);
});

void test('roulette service rejects invalid selection and records valid play', () => {
  const player = createDefaultPlayer('t2_test', 'tester', 1000);
  const invalid = processRouletteRound({
    request: { actionId: 'roulette_123456789', bet: 50, selection: { kind: 'single', number: 99 } },
    player,
    existingSnapshot: null,
    randomInt: () => 0,
    now: 2000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.status, 400);

  const valid = processRouletteRound({
    request: { actionId: 'roulette_123456790', bet: 50, selection: { kind: 'single', number: 0 } },
    player,
    existingSnapshot: null,
    randomInt: () => 0,
    now: 2000,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.response.player.statsByGame['capivara-roulette'].plays, 1);
  assert.equal(valid.response.result.reward, 1800);
});

void test('Jacare service debits start and cashout clears active round', () => {
  const player = createDefaultPlayer('t2_test', 'tester', 1000);
  const start = processJacareStart({
    request: { actionId: 'jacare_start_123456789', bet: 100 },
    player,
    existingSnapshot: null,
    randomInt: () => 500_000,
    now: 2000,
    userId: player.userId,
    roundId: 'jacare_round_123456789',
  });
  assert.equal(start.ok, true);
  if (!start.ok) return;
  assert.equal(start.response.player.balance, 9900);
  assert.equal(start.response.player.activeJacareRoundId, start.response.round.roundId);

  const cashout = processJacareCashout({
    request: { actionId: 'jacare_cashout_123456789', roundId: start.response.round.roundId },
    player: start.response.player,
    existingSnapshot: null,
    round: start.response.round,
    now: start.response.round.startedAt + 500,
    leaderboards: emptyLeaderboards(),
    ranks: {},
    globalStats,
  });
  assert.equal(cashout.ok, true);
  if (!cashout.ok) return;
  assert.equal(cashout.response.player.activeJacareRoundId, null);
  assert.equal(cashout.response.player.statsByGame['jacare-crash'].plays, 1);
});
