import type {
  CapivaraRoulettePlayResponse,
  GlobalStats,
  JacareCrashCashoutResponse,
  JacareCrashStartResponse,
  OncinhaPlayResponse,
  PlayerRanks,
  UrubuLeaderboards,
  UrubuPlayerState,
  UrubuzinhoPlayResponse,
} from '../../shared/urubuVegas';
import {
  applyGameOutcomeToPlayer,
  creditJacareCashoutToPlayer,
  debitGameBetFromPlayer,
  isValidJacareCashoutRequest,
  isValidJacareStartRequest,
  isValidRoulettePlayRequest,
  isValidSlotPlayRequest,
  URUBU_VEGAS_DISCLAIMER,
} from '../../shared/urubuVegas';
import { cashoutJacareRound, createJacareRound, type JacareCrashRound } from '../../shared/games/jacareCrash/CrashEngine';
import { playRoulette } from '../../shared/games/capivaraRoulette/RouletteEngine';
import type { RandomIntSource } from '../../shared/games/slot/types';
import { OncinhaSlotEngine } from '../../shared/games/oncinha777/SlotEngine';
import { SlotEngine } from '../../shared/games/urubuzinho/SlotEngine';

export type StoredRoundSnapshot<TResult = unknown> = {
  result: TResult;
  player: UrubuPlayerState;
};

export type ProcessBaseInput = {
  request: unknown;
  player: UrubuPlayerState;
  existingSnapshot: StoredRoundSnapshot | null;
  randomInt: RandomIntSource;
  now: number;
  leaderboards: UrubuLeaderboards;
  ranks: PlayerRanks;
  globalStats: GlobalStats;
};

export type ProcessRoundResult<TResponse, TResult = unknown> =
  | { ok: true; response: TResponse; snapshot: StoredRoundSnapshot<TResult>; replayed: boolean }
  | { ok: false; status: 400 | 402 | 409; message: string };

export const processUrubuzinhoRound = (
  input: ProcessBaseInput
): ProcessRoundResult<UrubuzinhoPlayResponse, UrubuzinhoPlayResponse['result']> => {
  if (!isValidSlotPlayRequest(input.request, 'urubuzinho')) {
    return { ok: false, status: 400, message: 'Invalid round request.' };
  }

  if (input.existingSnapshot) {
    const snapshot = input.existingSnapshot as StoredRoundSnapshot<UrubuzinhoPlayResponse['result']>;
    return {
      ok: true,
      replayed: true,
      snapshot,
      response: {
        type: 'urubuzinho-play',
        replayed: true,
        result: snapshot.result,
        player: snapshot.player,
        leaderboards: input.leaderboards,
        ranks: input.ranks,
        globalStats: input.globalStats,
        disclaimer: URUBU_VEGAS_DISCLAIMER,
      },
    };
  }

  if (input.player.balance < input.request.bet) {
    return { ok: false, status: 402, message: 'Not enough virtual credits.' };
  }

  const result = new SlotEngine(input.randomInt).play(input.request.bet);
  const player = applyGameOutcomeToPlayer(
    input.player,
    'urubuzinho',
    { bet: result.bet, reward: result.reward, multiplier: result.multiplier },
    input.now
  );
  const snapshot = { result, player };

  return {
    ok: true,
    replayed: false,
    snapshot,
    response: {
      type: 'urubuzinho-play',
      replayed: false,
      result,
      player,
      leaderboards: input.leaderboards,
      ranks: input.ranks,
      globalStats: input.globalStats,
      disclaimer: URUBU_VEGAS_DISCLAIMER,
    },
  };
};

export const processOncinhaRound = (
  input: ProcessBaseInput
): ProcessRoundResult<OncinhaPlayResponse, OncinhaPlayResponse['result']> => {
  if (!isValidSlotPlayRequest(input.request, 'oncinha-777')) {
    return { ok: false, status: 400, message: 'Invalid Oncinha request.' };
  }

  if (input.existingSnapshot) {
    const snapshot = input.existingSnapshot as StoredRoundSnapshot<OncinhaPlayResponse['result']>;
    return {
      ok: true,
      replayed: true,
      snapshot,
      response: {
        type: 'oncinha-play',
        replayed: true,
        result: snapshot.result,
        player: snapshot.player,
        leaderboards: input.leaderboards,
        ranks: input.ranks,
        globalStats: input.globalStats,
        disclaimer: URUBU_VEGAS_DISCLAIMER,
      },
    };
  }

  if (input.player.balance < input.request.bet) {
    return { ok: false, status: 402, message: 'Not enough virtual credits.' };
  }

  const result = new OncinhaSlotEngine(input.randomInt).play(input.request.bet);
  const player = applyGameOutcomeToPlayer(
    input.player,
    'oncinha-777',
    { bet: result.bet, reward: result.reward, multiplier: result.multiplier },
    input.now
  );
  const snapshot = { result, player };

  return {
    ok: true,
    replayed: false,
    snapshot,
    response: {
      type: 'oncinha-play',
      replayed: false,
      result,
      player,
      leaderboards: input.leaderboards,
      ranks: input.ranks,
      globalStats: input.globalStats,
      disclaimer: URUBU_VEGAS_DISCLAIMER,
    },
  };
};

export const processRouletteRound = (
  input: ProcessBaseInput
): ProcessRoundResult<CapivaraRoulettePlayResponse, CapivaraRoulettePlayResponse['result']> => {
  if (!isValidRoulettePlayRequest(input.request)) {
    return { ok: false, status: 400, message: 'Invalid roulette request.' };
  }

  if (input.existingSnapshot) {
    const snapshot = input.existingSnapshot as StoredRoundSnapshot<CapivaraRoulettePlayResponse['result']>;
    return {
      ok: true,
      replayed: true,
      snapshot,
      response: {
        type: 'capivara-roulette-play',
        replayed: true,
        result: snapshot.result,
        player: snapshot.player,
        leaderboards: input.leaderboards,
        ranks: input.ranks,
        globalStats: input.globalStats,
        disclaimer: URUBU_VEGAS_DISCLAIMER,
      },
    };
  }

  if (input.player.balance < input.request.bet) {
    return { ok: false, status: 402, message: 'Not enough virtual credits.' };
  }

  const result = playRoulette(input.request.bet, input.request.selection, input.randomInt);
  const player = applyGameOutcomeToPlayer(
    input.player,
    'capivara-roulette',
    { bet: result.bet, reward: result.reward, multiplier: result.multiplier },
    input.now
  );
  const snapshot = { result, player };

  return {
    ok: true,
    replayed: false,
    snapshot,
    response: {
      type: 'capivara-roulette-play',
      replayed: false,
      result,
      player,
      leaderboards: input.leaderboards,
      ranks: input.ranks,
      globalStats: input.globalStats,
      disclaimer: URUBU_VEGAS_DISCLAIMER,
    },
  };
};

export const processJacareStart = (
  input: {
    request: unknown;
    player: UrubuPlayerState;
    existingSnapshot: StoredRoundSnapshot<JacareCrashRound> | null;
    randomInt: RandomIntSource;
    now: number;
    userId: string;
    roundId: string;
  }
):
  | { ok: true; response: JacareCrashStartResponse; snapshot: StoredRoundSnapshot<JacareCrashRound>; replayed: boolean }
  | { ok: false; status: 400 | 402 | 409; message: string } => {
  if (!isValidJacareStartRequest(input.request)) {
    return { ok: false, status: 400, message: 'Invalid crash start request.' };
  }
  if (input.existingSnapshot) {
    return {
      ok: true,
      replayed: true,
      snapshot: input.existingSnapshot,
      response: {
        type: 'jacare-crash-start',
        replayed: true,
        round: input.existingSnapshot.result,
        player: input.existingSnapshot.player,
        disclaimer: URUBU_VEGAS_DISCLAIMER,
      },
    };
  }
  if (input.player.activeJacareRoundId) {
    return { ok: false, status: 409, message: 'Finish the active Jacare round first.' };
  }
  if (input.player.balance < input.request.bet) {
    return { ok: false, status: 402, message: 'Not enough virtual credits.' };
  }

  const start = createJacareRound(
    {
      roundId: input.roundId,
      userId: input.userId,
      bet: input.request.bet,
      now: input.now,
    },
    input.randomInt
  );
  const player = debitGameBetFromPlayer(
    input.player,
    'jacare-crash',
    input.request.bet,
    start.round.roundId,
    input.now
  );
  const snapshot = { result: start.round, player };
  return {
    ok: true,
    replayed: false,
    snapshot,
    response: {
      type: 'jacare-crash-start',
      replayed: false,
      round: start.round,
      player,
      disclaimer: URUBU_VEGAS_DISCLAIMER,
    },
  };
};

export const processJacareCashout = (
  input: {
    request: unknown;
    player: UrubuPlayerState;
    existingSnapshot: StoredRoundSnapshot<JacareCrashCashoutResponse['result']> | null;
    round: JacareCrashRound | null;
    now: number;
    leaderboards: UrubuLeaderboards;
    ranks: PlayerRanks;
    globalStats: GlobalStats;
  }
):
  | {
      ok: true;
      response: JacareCrashCashoutResponse;
      snapshot: StoredRoundSnapshot<JacareCrashCashoutResponse['result']>;
      round: JacareCrashRound;
      replayed: boolean;
    }
  | { ok: false; status: 400 | 404 | 409; message: string } => {
  if (!isValidJacareCashoutRequest(input.request)) {
    return { ok: false, status: 400, message: 'Invalid crash cashout request.' };
  }
  if (input.existingSnapshot) {
    return {
      ok: true,
      replayed: true,
      snapshot: input.existingSnapshot,
      round:
        input.round ??
        {
          roundId: input.request.roundId,
          userId: input.player.userId,
          bet: 0,
          crashPoint: 1,
          startedAt: input.now,
          crashAt: input.now,
          completed: true,
        },
      response: {
        type: 'jacare-crash-cashout',
        replayed: true,
        roundId: input.request.roundId,
        result: input.existingSnapshot.result,
        player: input.existingSnapshot.player,
        leaderboards: input.leaderboards,
        ranks: input.ranks,
        globalStats: input.globalStats,
        disclaimer: URUBU_VEGAS_DISCLAIMER,
      },
    };
  }
  if (!input.round) {
    return { ok: false, status: 404, message: 'Crash round not found.' };
  }
  if (input.round.userId !== input.player.userId || input.player.activeJacareRoundId !== input.round.roundId) {
    return { ok: false, status: 409, message: 'Crash round does not belong to this player.' };
  }
  if (input.round.completed) {
    return { ok: false, status: 409, message: 'Crash round already completed.' };
  }

  const result = cashoutJacareRound(input.round, input.now);
  const player = creditJacareCashoutToPlayer(input.player, result, input.now);
  const completedRound = {
    ...input.round,
    completed: true,
  };
  const snapshot = { result, player };
  return {
    ok: true,
    replayed: false,
    snapshot,
    round: completedRound,
    response: {
      type: 'jacare-crash-cashout',
      replayed: false,
      roundId: completedRound.roundId,
      result,
      player,
      leaderboards: input.leaderboards,
      ranks: input.ranks,
      globalStats: input.globalStats,
      disclaimer: URUBU_VEGAS_DISCLAIMER,
    },
  };
};
