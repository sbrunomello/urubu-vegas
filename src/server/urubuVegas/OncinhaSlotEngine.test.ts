import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { OncinhaSlotEngine } from '../../shared/games/oncinha777/SlotEngine.ts';

void test('Oncinha slot uses a distinct paytable and wild substitution', () => {
  const engine = new OncinhaSlotEngine(() => 0);
  const result = engine.evaluateGrid(
    [
      ['wild', 'ruby', 'wild', 'ruby', 'ruby'],
      ['pearl', 'star', 'champagne', 'oncinha', 'seven'],
      ['star', 'pearl', 'oncinha', 'champagne', 'scatter'],
    ],
    100
  );
  assert.equal(result.gameId, 'oncinha-777');
  assert.equal(result.lineWins.some((win) => win.symbol === 'ruby' && win.count === 5), true);
  assert.equal(result.reward >= 2400, true);
});

void test('Oncinha scatter pays anywhere and simulation remains bounded', () => {
  const engine = new OncinhaSlotEngine(() => 0);
  const scatter = engine.evaluateGrid(
    [
      ['scatter', 'pearl', 'star', 'champagne', 'oncinha'],
      ['ruby', 'scatter', 'seven', 'pearl', 'star'],
      ['champagne', 'oncinha', 'scatter', 'ruby', 'seven'],
    ],
    100
  );
  assert.equal(scatter.scatterWin?.count, 3);
  assert.equal(scatter.scatterWin?.reward, 250);

  let seed = 7;
  const random = (maxExclusive: number): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % maxExclusive;
  };
  const simulation = new OncinhaSlotEngine(random);
  let reward = 0;
  const rounds = 20_000;
  for (let index = 0; index < rounds; index += 1) {
    reward += simulation.play(100).reward;
  }
  const effectiveReturn = reward / (rounds * 100);
  assert.equal(effectiveReturn > 0.65 && effectiveReturn < 1.8, true);
});
