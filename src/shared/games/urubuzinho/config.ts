import {
  URUBUZINHO_PAYLINES,
  URUBUZINHO_PAYTABLE,
  URUBUZINHO_SCATTER_MULTIPLIERS,
} from './paytable';
import { URUBUZINHO_SYMBOLS, type UrubuzinhoSymbolId } from './symbols';

export const URUBUZINHO_REELS = 5;
export const URUBUZINHO_ROWS = 3;
export const INITIAL_VIRTUAL_BALANCE = 10_000;
export const URUBUZINHO_BET_VALUES: readonly number[] = [10, 50, 100, 250, 500];
const URUBUZINHO_FALLBACK_SYMBOL: UrubuzinhoSymbolId = 'banana';

export const WIN_CATEGORY_THRESHOLDS = {
  win: 1,
  bigWin: 5,
  megaWin: 15,
};

export const URUBUZINHO_CONFIG = {
  gameId: 'urubuzinho',
  reels: URUBUZINHO_REELS,
  rows: URUBUZINHO_ROWS,
  symbols: URUBUZINHO_SYMBOLS,
  paylines: URUBUZINHO_PAYLINES,
  paytable: URUBUZINHO_PAYTABLE,
  scatterMultipliers: URUBUZINHO_SCATTER_MULTIPLIERS,
  fallbackSymbol: URUBUZINHO_FALLBACK_SYMBOL,
  betValues: URUBUZINHO_BET_VALUES,
  initialBalance: INITIAL_VIRTUAL_BALANCE,
  winCategoryThresholds: WIN_CATEGORY_THRESHOLDS,
};
