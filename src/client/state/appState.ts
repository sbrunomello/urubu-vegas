import type {
  GlobalStats,
  GameId,
  GameInitPayload,
  JacareCrashRound,
  PlayerRanks,
  UrubuLeaderboards,
  UrubuPlayerState,
} from '../../shared/api';
import { emptyLeaderboards, gameInitPayloads } from '../../shared/api';

export type AppState = {
  player: UrubuPlayerState | null;
  leaderboards: UrubuLeaderboards;
  ranks: PlayerRanks;
  globalStats: GlobalStats;
  betValues: readonly number[];
  games: Record<GameId, GameInitPayload>;
  disclaimer: string;
  selectedBet: number;
  lastError: string | null;
  lastNotice: string | null;
  activeJacareRound: JacareCrashRound | null;
};

export const appState: AppState = {
  player: null,
  leaderboards: emptyLeaderboards(),
  ranks: {},
  globalStats: {
    communityPlays: 0,
    largestRecordedWin: 0,
  },
  betValues: [10, 50, 100, 250, 500],
  games: gameInitPayloads(),
  disclaimer: 'Virtual credits only. No purchases, prizes or withdrawals.',
  selectedBet: 50,
  lastError: null,
  lastNotice: null,
  activeJacareRound: null,
};

export const applyServerState = (state: {
  player?: UrubuPlayerState;
  leaderboards?: UrubuLeaderboards;
  ranks?: PlayerRanks;
  globalStats?: GlobalStats;
  betValues?: readonly number[];
  games?: Record<GameId, GameInitPayload>;
  disclaimer?: string;
  activeJacareRound?: JacareCrashRound | null;
}): void => {
  if (state.player) appState.player = state.player;
  if (state.activeJacareRound !== undefined) {
    appState.activeJacareRound = state.activeJacareRound;
  } else if (state.player?.activeJacareRoundId === null) {
    appState.activeJacareRound = null;
  }
  if (state.leaderboards) appState.leaderboards = state.leaderboards;
  if (state.ranks) appState.ranks = state.ranks;
  if (state.globalStats) appState.globalStats = state.globalStats;
  if (state.betValues) appState.betValues = state.betValues;
  if (state.games) appState.games = state.games;
  if (state.disclaimer) appState.disclaimer = state.disclaimer;
  if (!appState.betValues.includes(appState.selectedBet)) {
    appState.selectedBet = appState.betValues[0] ?? 10;
  }
};
