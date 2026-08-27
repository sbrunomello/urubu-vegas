import { ONCINHA_PAYLINES, ONCINHA_PAYTABLE, ONCINHA_SCATTER_MULTIPLIERS } from './paytable';
import { ONCINHA_SYMBOLS, type OncinhaSymbolId } from './symbols';

export const ONCINHA_REELS = 5;
export const ONCINHA_ROWS = 3;
export const ONCINHA_BET_VALUES: readonly number[] = [10, 50, 100, 250, 500];
const ONCINHA_FALLBACK_SYMBOL: OncinhaSymbolId = 'pearl';

export const ONCINHA_CONFIG = {
  gameId: 'oncinha-777',
  reels: ONCINHA_REELS,
  rows: ONCINHA_ROWS,
  symbols: ONCINHA_SYMBOLS,
  paylines: ONCINHA_PAYLINES,
  paytable: ONCINHA_PAYTABLE,
  scatterMultipliers: ONCINHA_SCATTER_MULTIPLIERS,
  fallbackSymbol: ONCINHA_FALLBACK_SYMBOL,
  betValues: ONCINHA_BET_VALUES,
};
