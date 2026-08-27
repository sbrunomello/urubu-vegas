import { GenericSlotEngine } from '../slot/SlotEngine';
import {
  categorizeWin,
  type RandomIntSource,
  type SlotGrid,
  type SlotLineWin,
  type SlotRoundResult,
  type SlotScatterWin,
  type WinCategory,
  type WinningCell,
} from '../slot/types';
import { URUBUZINHO_CONFIG } from './config';
import type { UrubuzinhoSymbolId } from './symbols';

export type { RandomIntSource, WinCategory, WinningCell };

export type UrubuzinhoGrid = SlotGrid<UrubuzinhoSymbolId>;
export type LineWin = SlotLineWin<UrubuzinhoSymbolId>;
export type ScatterWin = SlotScatterWin;
export type UrubuzinhoRoundResult = SlotRoundResult<UrubuzinhoSymbolId>;

export class SlotEngine extends GenericSlotEngine<UrubuzinhoSymbolId> {
  constructor(randomInt: RandomIntSource) {
    super(URUBUZINHO_CONFIG, randomInt);
  }
}

export const isValidUrubuzinhoGrid = (grid: unknown): grid is UrubuzinhoGrid =>
  new SlotEngine(() => 0).isValidGrid(grid);

export { categorizeWin };
