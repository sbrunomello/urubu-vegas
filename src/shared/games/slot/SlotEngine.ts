import {
  categorizeWin,
  type RandomIntSource,
  type SlotConfig,
  type SlotGrid,
  type SlotLineWin,
  type SlotPayline,
  type SlotRoundResult,
  type SlotScatterWin,
  type WinningCell,
} from './types';

export class GenericSlotEngine<TSymbol extends string> {
  private readonly randomInt: RandomIntSource;
  private readonly config: SlotConfig<TSymbol>;

  constructor(config: SlotConfig<TSymbol>, randomInt: RandomIntSource) {
    this.config = config;
    this.randomInt = randomInt;
  }

  generateGrid(): SlotGrid<TSymbol> {
    const grid: TSymbol[][] = [];
    for (let row = 0; row < this.config.rows; row += 1) {
      const symbols: TSymbol[] = [];
      for (let reel = 0; reel < this.config.reels; reel += 1) {
        symbols.push(this.pickSymbol());
      }
      grid.push(symbols);
    }
    return grid;
  }

  play(bet: number): SlotRoundResult<TSymbol> {
    return this.evaluateGrid(this.generateGrid(), bet);
  }

  evaluateGrid(grid: SlotGrid<TSymbol>, bet: number): SlotRoundResult<TSymbol> {
    if (!this.isValidGrid(grid)) {
      throw new Error(`Invalid ${this.config.gameId} grid.`);
    }
    if (!Number.isInteger(bet) || bet <= 0) {
      throw new Error('Bet must be a positive integer.');
    }

    const lineWins = this.config.paylines
      .map((payline) => this.evaluatePayline(grid, payline, bet))
      .filter((win): win is SlotLineWin<TSymbol> => win !== null);
    const scatterWin = this.evaluateScatter(grid, bet);
    const reward =
      lineWins.reduce((total, win) => total + win.reward, 0) +
      (scatterWin?.reward ?? 0);
    const multiplier = Number((reward / bet).toFixed(2));

    return {
      gameId: this.config.gameId,
      grid,
      bet,
      reward,
      netChange: reward - bet,
      multiplier,
      category: categorizeWin(multiplier),
      lineWins,
      scatterWin,
    };
  }

  isValidGrid(grid: unknown): grid is SlotGrid<TSymbol> {
    if (!Array.isArray(grid) || grid.length !== this.config.rows) return false;
    return grid.every(
      (row) =>
        Array.isArray(row) &&
        row.length === this.config.reels &&
        row.every((symbol) => this.isKnownSymbol(symbol))
    );
  }

  private pickSymbol(): TSymbol {
    const totalWeight = this.config.symbols.reduce((total, symbol) => total + symbol.weight, 0);
    const roll = this.randomInt(totalWeight);
    let cursor = 0;

    for (const symbol of this.config.symbols) {
      cursor += symbol.weight;
      if (roll < cursor) return symbol.id;
    }

    return this.config.fallbackSymbol;
  }

  private evaluatePayline(
    grid: SlotGrid<TSymbol>,
    payline: SlotPayline,
    bet: number
  ): SlotLineWin<TSymbol> | null {
    const lineSymbols = payline.rows.map((row, reel) => grid[row]?.[reel]);
    const first = lineSymbols[0];
    if (!first || this.getSymbol(first).isScatter) return null;

    const baseSymbol = this.resolvePaylineBaseSymbol(lineSymbols);
    if (!baseSymbol) return null;

    const cells: WinningCell[] = [];
    for (let reel = 0; reel < lineSymbols.length; reel += 1) {
      const symbol = lineSymbols[reel];
      const row = payline.rows[reel];
      if (symbol === undefined || row === undefined) break;
      const definition = this.getSymbol(symbol);
      if (definition.isScatter) break;
      if (this.getSymbol(baseSymbol).isWild && symbol !== baseSymbol) break;
      if (!this.getSymbol(baseSymbol).isWild && symbol !== baseSymbol && !definition.isWild) {
        break;
      }
      cells.push({ row, reel });
    }

    const count = cells.length;
    if (count < 3) return null;
    const payouts = this.config.paytable[baseSymbol] ?? {};
    const multiplier = count >= 5 ? payouts[5] : count === 4 ? payouts[4] : payouts[3];
    if (!multiplier) return null;

    return {
      paylineId: payline.id,
      label: payline.label,
      symbol: baseSymbol,
      count,
      multiplier,
      reward: Math.round(bet * multiplier),
      cells,
    };
  }

  private evaluateScatter(grid: SlotGrid<TSymbol>, bet: number): SlotScatterWin | null {
    const cells: WinningCell[] = [];
    for (let row = 0; row < this.config.rows; row += 1) {
      for (let reel = 0; reel < this.config.reels; reel += 1) {
        const symbol = grid[row]?.[reel];
        if (symbol && this.getSymbol(symbol).isScatter) cells.push({ row, reel });
      }
    }

    if (cells.length < 3) return null;
    const count = Math.min(cells.length, 5);
    const multiplier =
      count >= 5
        ? this.config.scatterMultipliers[5]
        : count === 4
          ? this.config.scatterMultipliers[4]
          : this.config.scatterMultipliers[3];

    return {
      count: cells.length,
      multiplier,
      reward: Math.round(bet * multiplier),
      cells,
    };
  }

  private resolvePaylineBaseSymbol(
    lineSymbols: readonly (TSymbol | undefined)[]
  ): TSymbol | null {
    for (const symbol of lineSymbols) {
      if (!symbol) return null;
      const definition = this.getSymbol(symbol);
      if (definition.isScatter) return null;
      if (!definition.isWild) return symbol;
    }
    return lineSymbols[0] ?? null;
  }

  private getSymbol(symbolId: TSymbol) {
    const symbol = this.config.symbols.find((entry) => entry.id === symbolId);
    if (!symbol) throw new Error(`Unknown slot symbol: ${symbolId}`);
    return symbol;
  }

  private isKnownSymbol(value: unknown): value is TSymbol {
    return typeof value === 'string' && this.config.symbols.some((symbol) => symbol.id === value);
  }
}
