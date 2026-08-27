export type RandomIntSource = (maxExclusive: number) => number;

export type SlotSymbolDefinition<TSymbol extends string> = {
  id: TSymbol;
  label: string;
  assetKey: string;
  assetPath: string;
  color: number;
  weight: number;
  isWild: boolean;
  isScatter: boolean;
};

export type SlotPayline = {
  id: string;
  label: string;
  rows: readonly number[];
};

export type SlotSymbolLinePayouts = Partial<Record<3 | 4 | 5, number>>;

export type SlotConfig<TSymbol extends string> = {
  gameId: string;
  reels: number;
  rows: number;
  symbols: readonly SlotSymbolDefinition<TSymbol>[];
  paylines: readonly SlotPayline[];
  paytable: Record<string, SlotSymbolLinePayouts>;
  scatterMultipliers: Record<3 | 4 | 5, number>;
  fallbackSymbol: TSymbol;
};

export type SlotGrid<TSymbol extends string> = readonly (readonly TSymbol[])[];

export type WinningCell = {
  row: number;
  reel: number;
};

export type SlotLineWin<TSymbol extends string> = {
  paylineId: string;
  label: string;
  symbol: TSymbol;
  count: number;
  multiplier: number;
  reward: number;
  cells: readonly WinningCell[];
};

export type SlotScatterWin = {
  count: number;
  multiplier: number;
  reward: number;
  cells: readonly WinningCell[];
};

export type WinCategory = 'miss' | 'win' | 'big-win' | 'mega-win';

export type SlotRoundResult<TSymbol extends string> = {
  gameId: string;
  grid: SlotGrid<TSymbol>;
  bet: number;
  reward: number;
  netChange: number;
  multiplier: number;
  category: WinCategory;
  lineWins: readonly SlotLineWin<TSymbol>[];
  scatterWin: SlotScatterWin | null;
};

export const WIN_CATEGORY_THRESHOLDS = {
  win: 1,
  bigWin: 5,
  megaWin: 15,
};

export const categorizeWin = (multiplier: number): WinCategory => {
  if (multiplier >= WIN_CATEGORY_THRESHOLDS.megaWin) return 'mega-win';
  if (multiplier >= WIN_CATEGORY_THRESHOLDS.bigWin) return 'big-win';
  if (multiplier >= WIN_CATEGORY_THRESHOLDS.win) return 'win';
  return 'miss';
};
