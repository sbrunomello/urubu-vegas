import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { applyRoundToPlayer, createDefaultPlayer, isValidActionId, isValidBet } from '../../shared/urubuVegas.ts';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { categorizeWin, SlotEngine } from '../../shared/games/urubuzinho/SlotEngine.ts';

const sequenceRng = (values: readonly number[]) => {
  let index = 0;
  return (maxExclusive: number): number => {
    const value = values[index] ?? 0;
    index += 1;
    return value % maxExclusive;
  };
};

void test('RNG injection generates deterministic valid 5x3 grids', () => {
  const engine = new SlotEngine(sequenceRng([0, 24, 44, 60, 73, 83, 91, 96, 1, 25, 45, 61, 74, 84, 92]));
  const grid = engine.generateGrid();
  assert.equal(grid.length, 3);
  assert.equal(grid[0]?.length, 5);
  assert.deepEqual(grid[0], ['banana', 'coconut', 'vulture', 'seven', 'diamond']);
  assert.deepEqual(grid[1], ['crown', 'wild', 'scatter', 'banana', 'coconut']);
});

void test('paytable rewards left-to-right line wins', () => {
  const engine = new SlotEngine(sequenceRng([]));
  const result = engine.evaluateGrid(
    [
      ['banana', 'banana', 'banana', 'seven', 'crown'],
      ['coconut', 'seven', 'diamond', 'crown', 'banana'],
      ['diamond', 'crown', 'seven', 'coconut', 'vulture'],
    ],
    100
  );
  assert.equal(result.reward, 45);
  assert.equal(result.lineWins.length, 1);
  assert.equal(result.lineWins[0]?.symbol, 'banana');
});

void test('WILD substitutes normal symbols but not SCATTER', () => {
  const engine = new SlotEngine(sequenceRng([]));
  const result = engine.evaluateGrid(
    [
      ['wild', 'diamond', 'wild', 'diamond', 'scatter'],
      ['scatter', 'wild', 'scatter', 'wild', 'diamond'],
      ['banana', 'coconut', 'seven', 'crown', 'vulture'],
    ],
    100
  );
  assert.equal(result.lineWins.some((win) => win.symbol === 'diamond' && win.count === 4), true);
  assert.equal(result.lineWins.some((win) => win.symbol === 'scatter'), false);
});

void test('SCATTER pays anywhere with three or more symbols', () => {
  const engine = new SlotEngine(sequenceRng([]));
  const result = engine.evaluateGrid(
    [
      ['scatter', 'banana', 'coconut', 'seven', 'crown'],
      ['vulture', 'scatter', 'diamond', 'coconut', 'banana'],
      ['crown', 'seven', 'scatter', 'vulture', 'diamond'],
    ],
    50
  );
  assert.equal(result.scatterWin?.count, 3);
  assert.equal(result.scatterWin?.reward, 100);
});

void test('round application preserves non-negative balance and updates stats', () => {
  const player = createDefaultPlayer('t2_test', 'tester', 1000);
  const engine = new SlotEngine(sequenceRng([]));
  const result = engine.evaluateGrid(
    [
      ['wild', 'wild', 'wild', 'wild', 'wild'],
      ['banana', 'coconut', 'seven', 'crown', 'diamond'],
      ['coconut', 'seven', 'crown', 'diamond', 'banana'],
    ],
    100
  );
  const next = applyRoundToPlayer(player, result, 2000);
  assert.equal(next.balance, player.balance - result.bet + result.reward);
  assert.equal(next.totalRounds, 1);
  assert.equal(next.totalSpent, 100);
  assert.equal(next.biggestWin, result.reward);
  assert.equal(next.currentStreak, 1);
  assert.equal(next.bestStreak, 1);
});

void test('invalid bets and actionIds are rejected by shared validators', () => {
  assert.equal(isValidBet(50), true);
  assert.equal(isValidBet(51), false);
  assert.equal(isValidActionId('round_123456789'), true);
  assert.equal(isValidActionId('bad id spaces'), false);
});

void test('high reward categories are threshold based', () => {
  assert.equal(categorizeWin(0), 'miss');
  assert.equal(categorizeWin(1), 'win');
  assert.equal(categorizeWin(5), 'big-win');
  assert.equal(categorizeWin(15), 'mega-win');
});

void test('large simulation stays in a playable arcade range', () => {
  let seed = 42;
  const random = (maxExclusive: number): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed % maxExclusive;
  };
  const engine = new SlotEngine(random);
  let hits = 0;
  let reward = 0;
  const rounds = 30_000;
  for (let index = 0; index < rounds; index += 1) {
    const result = engine.play(100);
    if (result.reward > 0) hits += 1;
    reward += result.reward;
  }
  const hitFrequency = hits / rounds;
  const effectiveReturn = reward / (rounds * 100);
  assert.equal(hitFrequency > 0.22 && hitFrequency < 0.7, true);
  assert.equal(effectiveReturn > 0.65 && effectiveReturn < 1.6, true);
});
