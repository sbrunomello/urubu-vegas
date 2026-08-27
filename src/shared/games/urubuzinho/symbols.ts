export type UrubuzinhoSymbolId =
  | 'vulture'
  | 'banana'
  | 'coconut'
  | 'crown'
  | 'diamond'
  | 'seven'
  | 'wild'
  | 'scatter';

export type UrubuzinhoSymbolDefinition = {
  id: UrubuzinhoSymbolId;
  label: string;
  assetKey: string;
  assetPath: string;
  color: number;
  weight: number;
  isWild: boolean;
  isScatter: boolean;
};

export const URUBUZINHO_SYMBOLS: readonly UrubuzinhoSymbolDefinition[] = [
  {
    id: 'banana',
    label: 'Banana',
    assetKey: 'uv-symbol-banana',
    assetPath: '/assets/games/urubuzinho/symbols/banana.svg',
    color: 0xffd54a,
    weight: 24,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'coconut',
    label: 'Coconut',
    assetKey: 'uv-symbol-coconut',
    assetPath: '/assets/games/urubuzinho/symbols/coconut.svg',
    color: 0xd7f2e4,
    weight: 20,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'vulture',
    label: 'Urubu',
    assetKey: 'uv-symbol-vulture',
    assetPath: '/assets/games/urubuzinho/symbols/vulture.svg',
    color: 0x8d7bff,
    weight: 16,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'seven',
    label: 'Seven',
    assetKey: 'uv-symbol-seven',
    assetPath: '/assets/games/urubuzinho/symbols/seven.svg',
    color: 0xff425d,
    weight: 13,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'diamond',
    label: 'Diamond',
    assetKey: 'uv-symbol-diamond',
    assetPath: '/assets/games/urubuzinho/symbols/diamond.svg',
    color: 0x69f7ff,
    weight: 10,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'crown',
    label: 'Crown',
    assetKey: 'uv-symbol-crown',
    assetPath: '/assets/games/urubuzinho/symbols/crown.svg',
    color: 0xffb93f,
    weight: 8,
    isWild: false,
    isScatter: false,
  },
  {
    id: 'wild',
    label: 'Wild',
    assetKey: 'uv-symbol-wild',
    assetPath: '/assets/games/urubuzinho/symbols/wild.svg',
    color: 0x7aff8d,
    weight: 5,
    isWild: true,
    isScatter: false,
  },
  {
    id: 'scatter',
    label: 'Scatter',
    assetKey: 'uv-symbol-scatter',
    assetPath: '/assets/games/urubuzinho/symbols/scatter.svg',
    color: 0xff5c93,
    weight: 4,
    isWild: false,
    isScatter: true,
  },
];

export const getSymbolDefinition = (
  id: UrubuzinhoSymbolId
): UrubuzinhoSymbolDefinition => {
  const symbol = URUBUZINHO_SYMBOLS.find((entry) => entry.id === id);
  if (!symbol) throw new Error(`Unknown Urubuzinho symbol: ${id}`);
  return symbol;
};

export const isUrubuzinhoSymbolId = (
  value: unknown
): value is UrubuzinhoSymbolId =>
  typeof value === 'string' &&
  URUBUZINHO_SYMBOLS.some((symbol) => symbol.id === value);
