import { GenericSlotEngine } from '../slot/SlotEngine';
import type {
  RandomIntSource,
  SlotGrid,
  SlotLineWin,
  SlotRoundResult,
  SlotScatterWin,
} from '../slot/types';
import { ONCINHA_CONFIG } from './config';
import type { OncinhaSymbolId } from './symbols';

export type OncinhaGrid = SlotGrid<OncinhaSymbolId>;
export type OncinhaLineWin = SlotLineWin<OncinhaSymbolId>;
export type OncinhaScatterWin = SlotScatterWin;
export type OncinhaRoundResult = SlotRoundResult<OncinhaSymbolId>;

export class OncinhaSlotEngine extends GenericSlotEngine<OncinhaSymbolId> {
  constructor(randomInt: RandomIntSource) {
    super(ONCINHA_CONFIG, randomInt);
  }
}

export const isValidOncinhaGrid = (grid: unknown): grid is OncinhaGrid =>
  new OncinhaSlotEngine(() => 0).isValidGrid(grid);
