import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { isValidRouletteSelection, playRoulette, rouletteColor, rouletteSelectionWins } from '../../shared/games/capivaraRoulette/RouletteEngine.ts';

void test('roulette color and zero behavior are European-style', () => {
  assert.equal(rouletteColor(0), 'green');
  assert.equal(rouletteSelectionWins({ kind: 'red' }, 0), false);
  assert.equal(rouletteSelectionWins({ kind: 'even' }, 0), false);
  assert.equal(rouletteSelectionWins({ kind: 'single', number: 0 }, 0), true);
});

void test('roulette rewards even-money and single-number picks', () => {
  const red = playRoulette(100, { kind: 'red' }, () => 1);
  assert.equal(red.won, true);
  assert.equal(red.reward, 200);

  const single = playRoulette(100, { kind: 'single', number: 7 }, () => 7);
  assert.equal(single.won, true);
  assert.equal(single.reward, 3600);
});

void test('roulette selection validator rejects invalid singles', () => {
  assert.equal(isValidRouletteSelection({ kind: 'black' }), true);
  assert.equal(isValidRouletteSelection({ kind: 'single', number: 36 }), true);
  assert.equal(isValidRouletteSelection({ kind: 'single', number: 37 }), false);
  assert.equal(isValidRouletteSelection({ kind: 'single', number: -1 }), false);
});
