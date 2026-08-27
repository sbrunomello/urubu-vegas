export type OncinhaSymbolId =
  | 'oncinha'
  | 'champagne'
  | 'star'
  | 'ruby'
  | 'pearl'
  | 'seven'
  | 'wild'
  | 'scatter';

export type OncinhaSymbolDefinition = {
  id: OncinhaSymbolId;
  label: string;
  assetKey: string;
  assetPath: string;
  color: number;
  weight: number;
  isWild: boolean;
  isScatter: boolean;
};

export const ONCINHA_SYMBOLS: readonly OncinhaSymbolDefinition[] = [
  {
    id: 'pearl',
    label: 'Pearl',
    assetKey: 'onc-symbol-pearl',
    assetPath: '/assets/games/oncinha-777/symbols/pearl.svg',
    color: 0xf8f3ff,
    weight: 23,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'star',
    label: 'Star',
    assetKey: 'onc-symbol-star',
    assetPath: '/assets/games/oncinha-777/symbols/star.svg',
    color: 0xffd54a,
    weight: 20,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'champagne',
    label: 'Champagne',
    assetKey: 'onc-symbol-champagne',
    assetPath: '/assets/games/oncinha-777/symbols/champagne.svg',
    color: 0xffe2a1,
    weight: 16,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'oncinha',
    label: 'Oncinha',
    assetKey: 'onc-symbol-oncinha',
    assetPath: '/assets/games/oncinha-777/symbols/oncinha.svg',
    color: 0xffa33f,
    weight: 14,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'seven',
    label: 'Triple Seven',
    assetKey: 'onc-symbol-seven',
    assetPath: '/assets/games/oncinha-777/symbols/seven.svg',
    color: 0xff335a,
    weight: 11,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'ruby',
    label: 'Ruby',
    assetKey: 'onc-symbol-ruby',
    assetPath: '/assets/games/oncinha-777/symbols/ruby.svg',
    color: 0xff426e,
    weight: 9,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'wild',
    label: 'Wild Rose',
    assetKey: 'onc-symbol-wild',
    assetPath: '/assets/games/oncinha-777/symbols/wild.svg',
    color: 0x7aff8d,
    weight: 4,
    isWild: true,
    isScatter: false,
  },
  {
    id: 'scatter',
    label: 'Paw Scatter',
    assetKey: 'onc-symbol-scatter',
    assetPath: '/assets/games/oncinha-777/symbols/scatter.svg',
    color: 0xb86cff,
    weight: 3,
    isWild: false,
    isScatter: true,
  },
];

export const getOncinhaSymbolDefinition = (id: OncinhaSymbolId): OncinhaSymbolDefinition => {
  const symbol = ONCINHA_SYMBOLS.find((entry) => entry.id === id);
  if (!symbol) throw new Error(`Unknown Oncinha symbol: ${id}`);
  return symbol;
};

export const isOncinhaSymbolId = (value: unknown): value is OncinhaSymbolId =>
  typeof value === 'string' && ONCINHA_SYMBOLS.some((symbol) => symbol.id === value);
