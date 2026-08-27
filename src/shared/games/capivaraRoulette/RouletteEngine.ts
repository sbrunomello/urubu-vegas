import type { RandomIntSource } from '../slot/types';

export const CAPIVARA_ROULETTE_BET_VALUES: readonly number[] = [10, 50, 100, 250, 500];

export type RouletteColor = 'green' | 'red' | 'black';
export type RouletteEvenMoneySelection = 'red' | 'black' | 'odd' | 'even' | 'low' | 'high';

export type RouletteSelection =
  | {
      kind: RouletteEvenMoneySelection;
    }
  | {
      kind: 'single';
      number: number;
    };

export type RouletteResult = {
  gameId: 'capivara-roulette';
  bet: number;
  selection: RouletteSelection;
  number: number;
  color: RouletteColor;
  reward: number;
  netChange: number;
  multiplier: number;
  won: boolean;
};

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const rouletteColor = (number: number): RouletteColor => {
  if (number === 0) return 'green';
  return RED_NUMBERS.has(number) ? 'red' : 'black';
};

export const isValidRouletteSelection = (value: unknown): value is RouletteSelection => {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  if (
    value.kind === 'red' ||
    value.kind === 'black' ||
    value.kind === 'odd' ||
    value.kind === 'even' ||
    value.kind === 'low' ||
    value.kind === 'high'
  ) {
    return true;
  }
  if (value.kind !== 'single' || !('number' in value)) return false;
  return typeof value.number === 'number' && Number.isInteger(value.number) && value.number >= 0 && value.number <= 36;
};

export const rouletteSelectionWins = (
  selection: RouletteSelection,
  number: number
): boolean => {
  if (selection.kind === 'single') return selection.number === number;
  if (number === 0) return false;
  if (selection.kind === 'red' || selection.kind === 'black') {
    return rouletteColor(number) === selection.kind;
  }
  if (selection.kind === 'odd') return number % 2 === 1;
  if (selection.kind === 'even') return number % 2 === 0;
  if (selection.kind === 'low') return number >= 1 && number <= 18;
  return number >= 19 && number <= 36;
};

export const playRoulette = (
  bet: number,
  selection: RouletteSelection,
  randomInt: RandomIntSource
): RouletteResult => {
  const number = randomInt(37);
  const won = rouletteSelectionWins(selection, number);
  const multiplier = selection.kind === 'single' ? 36 : 2;
  const reward = won ? bet * multiplier : 0;
  return {
    gameId: 'capivara-roulette',
    bet,
    selection,
    number,
    color: rouletteColor(number),
    reward,
    netChange: reward - bet,
    multiplier: won ? multiplier : 0,
    won,
  };
};
