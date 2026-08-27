import type { UrubuzinhoSymbolId } from './symbols';

export type Payline = {
  id: string;
  label: string;
  rows: readonly number[];
};

export type SymbolLinePayouts = Partial<Record<3 | 4 | 5, number>>;

export type Paytable = Record<Exclude<UrubuzinhoSymbolId, 'scatter'>, SymbolLinePayouts>;

export const URUBUZINHO_PAYLINES: readonly Payline[] = [
  { id: 'top', label: 'Top row', rows: [0, 0, 0, 0, 0] },
  { id: 'middle', label: 'Middle row', rows: [1, 1, 1, 1, 1] },
  { id: 'bottom', label: 'Bottom row', rows: [2, 2, 2, 2, 2] },
  { id: 'v-up', label: 'Vegas V', rows: [0, 1, 2, 1, 0] },
  { id: 'v-down', label: 'Reverse V', rows: [2, 1, 0, 1, 2] },
  { id: 'samba-left', label: 'Samba left', rows: [0, 0, 1, 2, 2] },
  { id: 'samba-right', label: 'Samba right', rows: [2, 2, 1, 0, 0] },
  { id: 'rise', label: 'Rising heat', rows: [2, 1, 1, 1, 0] },
  { id: 'fall', label: 'Falling heat', rows: [0, 1, 1, 1, 2] },
  { id: 'pulse', label: 'Neon pulse', rows: [1, 0, 1, 2, 1] },
];

export const URUBUZINHO_PAYTABLE: Paytable = {
  banana: { 3: 0.45, 4: 1.1, 5: 2.4 },
  coconut: { 3: 0.55, 4: 1.3, 5: 2.8 },
  vulture: { 3: 0.85, 4: 2.2, 5: 5.5 },
  seven: { 3: 1.1, 4: 3.4, 5: 8.5 },
  diamond: { 3: 1.5, 4: 5, 5: 13 },
  crown: { 3: 2, 4: 7, 5: 20 },
  wild: { 3: 2.6, 4: 9, 5: 28 },
};

export const URUBUZINHO_SCATTER_MULTIPLIERS: Record<3 | 4 | 5, number> = {
  3: 2,
  4: 6,
  5: 18,
};
