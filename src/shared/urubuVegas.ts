import {
  INITIAL_VIRTUAL_BALANCE,
  URUBUZINHO_BET_VALUES,
} from './games/urubuzinho/config';
import { ONCINHA_BET_VALUES } from './games/oncinha777/config';
import { JACARE_CRASH_BET_VALUES } from './games/jacareCrash/CrashEngine';
import {
  CAPIVARA_ROULETTE_BET_VALUES,
  isValidRouletteSelection,
  type RouletteResult,
  type RouletteSelection,
} from './games/capivaraRoulette/RouletteEngine';
import type {
  JacareCrashRound,
  JacareCashoutResult,
} from './games/jacareCrash/CrashEngine';
import type { OncinhaRoundResult } from './games/oncinha777/SlotEngine';
import type { UrubuzinhoRoundResult } from './games/urubuzinho/SlotEngine';

export const URUBU_VEGAS_DISCLAIMER =
  'Virtual credits only. No purchases, prizes or withdrawals.';

export const REDIS_KEY_SCHEMA_VERSION = 'uv:v1';

export type GameId =
  'urubuzinho' | 'oncinha-777' | 'jacare-crash' | 'capivara-roulette';

export const GAME_IDS: readonly GameId[] = [
  'urubuzinho',
  'oncinha-777',
  'jacare-crash',
  'capivara-roulette',
];

export type LeaderboardKind = 'richest' | 'biggestWin' | 'mostPlays';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  score: number;
};

export type UrubuLeaderboards = Record<
  LeaderboardKind,
  readonly LeaderboardEntry[]
>;

export type PlayerRanks = Partial<Record<LeaderboardKind, number | null>>;

export type GameStats = {
  plays: number;
  wins: number;
  totalRewarded: number;
  totalSpent: number;
  biggestWin: number;
  bestMultiplier: number;
};

export type GameStatsById = Record<GameId, GameStats>;

export type UrubuPlayerState = {
  userId: string;
  username: string;
  balance: number;
  totalRounds: number;
  totalRewarded: number;
  totalSpent: number;
  biggestWin: number;
  bestMultiplier: number;
  currentStreak: number;
  bestStreak: number;
  statsByGame: GameStatsById;
  activeJacareRoundId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type GlobalStats = {
  communityPlays: number;
  largestRecordedWin: number;
};

export type GameInitPayload = {
  gameId: GameId;
  betValues: readonly number[];
  disclaimer: string;
};

export type UrubuVegasInitResponse = {
  type: 'urubu-vegas-init';
  postId: string;
  player: UrubuPlayerState;
  activeJacareRound: JacareCrashRound | null;
  leaderboards: UrubuLeaderboards;
  ranks: PlayerRanks;
  globalStats: GlobalStats;
  betValues: readonly number[];
  games: Record<GameId, GameInitPayload>;
  disclaimer: string;
};

export type UrubuzinhoPlayRequest = {
  actionId: string;
  bet: number;
};

export type OncinhaPlayRequest = {
  actionId: string;
  bet: number;
};

export type CapivaraRoulettePlayRequest = {
  actionId: string;
  bet: number;
  selection: RouletteSelection;
};

export type JacareCrashStartRequest = {
  actionId: string;
  bet: number;
};

export type JacareCrashCashoutRequest = {
  actionId: string;
  roundId: string;
};

export type CasinoRoundResponse<TResult> = {
  replayed: boolean;
  result: TResult;
  player: UrubuPlayerState;
  leaderboards: UrubuLeaderboards;
  ranks: PlayerRanks;
  globalStats: GlobalStats;
  disclaimer: string;
};

export type UrubuzinhoPlayResponse =
  CasinoRoundResponse<UrubuzinhoRoundResult> & {
    type: 'urubuzinho-play';
  };

export type OncinhaPlayResponse = CasinoRoundResponse<OncinhaRoundResult> & {
  type: 'oncinha-play';
};

export type CapivaraRoulettePlayResponse =
  CasinoRoundResponse<RouletteResult> & {
    type: 'capivara-roulette-play';
  };

export type JacareCrashStartResponse = {
  type: 'jacare-crash-start';
  replayed: boolean;
  round: JacareCrashRound;
  player: UrubuPlayerState;
  disclaimer: string;
};

export type JacareCrashCashoutResponse =
  CasinoRoundResponse<JacareCashoutResult> & {
    type: 'jacare-crash-cashout';
    roundId: string;
  };

export type ErrorResponse = {
  status: 'error';
  message: string;
};

export const createDefaultGameStats = (): GameStats => ({
  plays: 0,
  wins: 0,
  totalRewarded: 0,
  totalSpent: 0,
  biggestWin: 0,
  bestMultiplier: 0,
});

export const createDefaultGameStatsById = (): GameStatsById => ({
  urubuzinho: createDefaultGameStats(),
  'oncinha-777': createDefaultGameStats(),
  'jacare-crash': createDefaultGameStats(),
  'capivara-roulette': createDefaultGameStats(),
});

export const getBetValues = (gameId: GameId): readonly number[] => {
  if (gameId === 'oncinha-777') return ONCINHA_BET_VALUES;
  if (gameId === 'jacare-crash') return JACARE_CRASH_BET_VALUES;
  if (gameId === 'capivara-roulette') return CAPIVARA_ROULETTE_BET_VALUES;
  return URUBUZINHO_BET_VALUES;
};

export const gameInitPayloads = (): Record<GameId, GameInitPayload> => ({
  urubuzinho: {
    gameId: 'urubuzinho',
    betValues: URUBUZINHO_BET_VALUES,
    disclaimer: URUBU_VEGAS_DISCLAIMER,
  },
  'oncinha-777': {
    gameId: 'oncinha-777',
    betValues: ONCINHA_BET_VALUES,
    disclaimer: URUBU_VEGAS_DISCLAIMER,
  },
  'jacare-crash': {
    gameId: 'jacare-crash',
    betValues: JACARE_CRASH_BET_VALUES,
    disclaimer: URUBU_VEGAS_DISCLAIMER,
  },
  'capivara-roulette': {
    gameId: 'capivara-roulette',
    betValues: CAPIVARA_ROULETTE_BET_VALUES,
    disclaimer: URUBU_VEGAS_DISCLAIMER,
  },
});

export const isValidBetForGame = (
  gameId: GameId,
  value: unknown
): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  getBetValues(gameId).includes(value);

export const isValidBet = (value: unknown): value is number =>
  isValidBetForGame('urubuzinho', value);

export const isValidActionId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length >= 12 &&
  value.length <= 96 &&
  /^[a-zA-Z0-9_-]+$/.test(value);

export const isValidRoundId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length >= 12 &&
  value.length <= 128 &&
  /^[a-zA-Z0-9:_-]+$/.test(value);

export const isValidSlotPlayRequest = (
  value: unknown,
  gameId: 'urubuzinho' | 'oncinha-777'
): value is UrubuzinhoPlayRequest | OncinhaPlayRequest => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('actionId' in value) || !('bet' in value)) return false;
  return (
    isValidActionId(value.actionId) && isValidBetForGame(gameId, value.bet)
  );
};

export const isValidPlayRequest = (
  value: unknown
): value is UrubuzinhoPlayRequest =>
  isValidSlotPlayRequest(value, 'urubuzinho');

export const isValidRoulettePlayRequest = (
  value: unknown
): value is CapivaraRoulettePlayRequest => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('actionId' in value) || !('bet' in value) || !('selection' in value))
    return false;
  return (
    isValidActionId(value.actionId) &&
    isValidBetForGame('capivara-roulette', value.bet) &&
    isValidRouletteSelection(value.selection)
  );
};

export const isValidJacareStartRequest = (
  value: unknown
): value is JacareCrashStartRequest => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('actionId' in value) || !('bet' in value)) return false;
  return (
    isValidActionId(value.actionId) &&
    isValidBetForGame('jacare-crash', value.bet)
  );
};

export const isValidJacareCashoutRequest = (
  value: unknown
): value is JacareCrashCashoutRequest => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('actionId' in value) || !('roundId' in value)) return false;
  return isValidActionId(value.actionId) && isValidRoundId(value.roundId);
};

export const createDefaultPlayer = (
  userId: string,
  username: string,
  now: number
): UrubuPlayerState => ({
  userId,
  username,
  balance: INITIAL_VIRTUAL_BALANCE,
  totalRounds: 0,
  totalRewarded: 0,
  totalSpent: 0,
  biggestWin: 0,
  bestMultiplier: 0,
  currentStreak: 0,
  bestStreak: 0,
  statsByGame: createDefaultGameStatsById(),
  activeJacareRoundId: null,
  createdAt: now,
  updatedAt: now,
});

export const normalizePlayer = (
  player: UrubuPlayerState
): UrubuPlayerState => ({
  ...player,
  statsByGame: {
    ...createDefaultGameStatsById(),
    ...player.statsByGame,
  },
  activeJacareRoundId: player.activeJacareRoundId || null,
});

export const applyGameOutcomeToPlayer = (
  player: UrubuPlayerState,
  gameId: GameId,
  input: {
    bet: number;
    reward: number;
    multiplier: number;
    countsAsRound?: boolean;
  },
  now: number
): UrubuPlayerState => {
  const countsAsRound = input.countsAsRound ?? true;
  if (player.balance < input.bet) {
    throw new Error('Insufficient balance.');
  }

  const won = input.reward > 0;
  const currentStreak = won ? player.currentStreak + 1 : 0;
  const balance = player.balance - input.bet + input.reward;

  if (balance < 0) {
    throw new Error('Round would make balance negative.');
  }

  const stats = player.statsByGame[gameId] ?? createDefaultGameStats();
  const nextStats: GameStats = {
    plays: stats.plays + (countsAsRound ? 1 : 0),
    wins: stats.wins + (won && countsAsRound ? 1 : 0),
    totalRewarded: stats.totalRewarded + input.reward,
    totalSpent: stats.totalSpent + input.bet,
    biggestWin: Math.max(stats.biggestWin, input.reward),
    bestMultiplier: Math.max(stats.bestMultiplier, input.multiplier),
  };

  return {
    ...player,
    balance,
    totalRounds: player.totalRounds + (countsAsRound ? 1 : 0),
    totalRewarded: player.totalRewarded + input.reward,
    totalSpent: player.totalSpent + input.bet,
    biggestWin: Math.max(player.biggestWin, input.reward),
    bestMultiplier: Math.max(player.bestMultiplier, input.multiplier),
    currentStreak,
    bestStreak: Math.max(player.bestStreak, currentStreak),
    statsByGame: {
      ...player.statsByGame,
      [gameId]: nextStats,
    },
    updatedAt: now,
  };
};

export const debitGameBetFromPlayer = (
  player: UrubuPlayerState,
  gameId: GameId,
  bet: number,
  activeJacareRoundId: string | null,
  now: number
): UrubuPlayerState => {
  if (player.balance < bet) throw new Error('Insufficient balance.');
  const stats = player.statsByGame[gameId] ?? createDefaultGameStats();
  return {
    ...player,
    balance: player.balance - bet,
    totalRounds: player.totalRounds + 1,
    totalSpent: player.totalSpent + bet,
    statsByGame: {
      ...player.statsByGame,
      [gameId]: {
        ...stats,
        plays: stats.plays + 1,
        totalSpent: stats.totalSpent + bet,
      },
    },
    activeJacareRoundId,
    updatedAt: now,
  };
};

export const creditJacareCashoutToPlayer = (
  player: UrubuPlayerState,
  result: JacareCashoutResult,
  now: number
): UrubuPlayerState => {
  const stats = player.statsByGame['jacare-crash'] ?? createDefaultGameStats();
  const won = result.reward > 0;
  const currentStreak = won ? player.currentStreak + 1 : 0;
  return {
    ...player,
    balance: player.balance + result.reward,
    totalRewarded: player.totalRewarded + result.reward,
    biggestWin: Math.max(player.biggestWin, result.reward),
    bestMultiplier: Math.max(player.bestMultiplier, result.multiplier),
    currentStreak,
    bestStreak: Math.max(player.bestStreak, currentStreak),
    statsByGame: {
      ...player.statsByGame,
      'jacare-crash': {
        ...stats,
        wins: stats.wins + (won ? 1 : 0),
        totalRewarded: stats.totalRewarded + result.reward,
        biggestWin: Math.max(stats.biggestWin, result.reward),
        bestMultiplier: Math.max(stats.bestMultiplier, result.multiplier),
      },
    },
    activeJacareRoundId: null,
    updatedAt: now,
  };
};

export const applyRoundToPlayer = (
  player: UrubuPlayerState,
  result: UrubuzinhoRoundResult,
  now: number
): UrubuPlayerState =>
  applyGameOutcomeToPlayer(
    player,
    'urubuzinho',
    {
      bet: result.bet,
      reward: result.reward,
      multiplier: result.multiplier,
    },
    now
  );

export const emptyLeaderboards = (): UrubuLeaderboards => ({
  richest: [],
  biggestWin: [],
  mostPlays: [],
});
