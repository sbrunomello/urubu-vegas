import type { SlotPayline, SlotSymbolLinePayouts } from '../slot/types';
import type { OncinhaSymbolId } from './symbols';

export type OncinhaPaytable = Record<Exclude<OncinhaSymbolId, 'scatter'>, SlotSymbolLinePayouts>;

export const ONCINHA_PAYLINES: readonly SlotPayline[] = [
  { id: 'middle', label: 'Runway middle', rows: [1, 1, 1, 1, 1] },
  { id: 'top', label: 'Top glam', rows: [0, 0, 0, 0, 0] },
  { id: 'bottom', label: 'Bottom glam', rows: [2, 2, 2, 2, 2] },
  { id: 'catwalk-up', label: 'Catwalk up', rows: [2, 1, 0, 1, 2] },
  { id: 'catwalk-down', label: 'Catwalk down', rows: [0, 1, 2, 1, 0] },
  { id: 'diamond-left', label: 'Diamond left', rows: [1, 0, 1, 2, 1] },
  { id: 'diamond-right', label: 'Diamond right', rows: [1, 2, 1, 0, 1] },
  { id: 'spotlight-rise', label: 'Spotlight rise', rows: [2, 2, 1, 0, 0] },
  { id: 'spotlight-fall', label: 'Spotlight fall', rows: [0, 0, 1, 2, 2] },
  { id: 'center-pounce', label: 'Center pounce', rows: [0, 1, 1, 1, 0] },
  { id: 'velvet-pounce', label: 'Velvet pounce', rows: [2, 1, 1, 1, 2] },
  { id: 'ruby-zigzag', label: 'Ruby zigzag', rows: [0, 1, 0, 1, 0] },
];

export const ONCINHA_PAYTABLE: OncinhaPaytable = {
  pearl: { 3: 0.35, 4: 0.95, 5: 2.1 },
  star: { 3: 0.45, 4: 1.2, 5: 2.9 },
  champagne: { 3: 0.7, 4: 1.9, 5: 4.6 },
  oncinha: { 3: 0.95, 4: 2.8, 5: 7.2 },
  seven: { 3: 1.4, 4: 4.6, 5: 12 },
  ruby: { 3: 2.2, 4: 7.5, 5: 24 },
  wild: { 3: 3.1, 4: 10, 5: 34 },
};

export const ONCINHA_SCATTER_MULTIPLIERS: Record<3 | 4 | 5, number> = {
  3: 2.5,
  4: 8,
  5: 24,
};
