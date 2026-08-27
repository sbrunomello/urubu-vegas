import type { RandomIntSource } from '../slot/types';

export const JACARE_CRASH_BET_VALUES: readonly number[] = [10, 50, 100, 250, 500];
export const JACARE_CRASH_MAX_MULTIPLIER = 25;
export const JACARE_CRASH_MIN_MULTIPLIER = 1;
export const JACARE_CRASH_EXPIRY_MS = 30_000;

export type JacareCrashRound = {
  roundId: string;
  userId: string;
  bet: number;
  crashPoint: number;
  startedAt: number;
  crashAt: number;
  completed: boolean;
};

export type JacareStartResult = {
  round: JacareCrashRound;
};

export type JacareCashoutResult =
  | {
      status: 'cashed-out';
      multiplier: number;
      reward: number;
      netChange: number;
    }
  | {
      status: 'crashed';
      multiplier: number;
      reward: 0;
      netChange: number;
    };

export const multiplierAt = (startedAt: number, now: number): number => {
  const elapsed = Math.max(0, now - startedAt);
  const raw = 1 + elapsed / 1050;
  return Number(Math.min(JACARE_CRASH_MAX_MULTIPLIER, raw).toFixed(2));
};

export const crashDelayMs = (crashPoint: number): number =>
  Math.max(0, Math.round((crashPoint - 1) * 1050));

export const generateCrashPoint = (randomInt: RandomIntSource): number => {
  const roll = randomInt(1_000_000);
  if (roll < 42_000) return 1;
  const normalized = (roll + 1) / 1_000_001;
  const curved = 0.96 / (1 - normalized);
  const multiplier = Math.min(JACARE_CRASH_MAX_MULTIPLIER, Math.max(1.01, curved));
  return Number(multiplier.toFixed(2));
};

export const createJacareRound = (
  input: {
    roundId: string;
    userId: string;
    bet: number;
    now: number;
  },
  randomInt: RandomIntSource
): JacareStartResult => {
  const crashPoint = generateCrashPoint(randomInt);
  const startedAt = input.now;
  return {
    round: {
      roundId: input.roundId,
      userId: input.userId,
      bet: input.bet,
      crashPoint,
      startedAt,
      crashAt: startedAt + crashDelayMs(crashPoint),
      completed: false,
    },
  };
};

export const cashoutJacareRound = (
  round: JacareCrashRound,
  now: number
): JacareCashoutResult => {
  const multiplier = multiplierAt(round.startedAt, now);
  if (now >= round.crashAt || multiplier >= round.crashPoint) {
    return {
      status: 'crashed',
      multiplier: round.crashPoint,
      reward: 0,
      netChange: -round.bet,
    };
  }

  const reward = Math.round(round.bet * multiplier);
  return {
    status: 'cashed-out',
    multiplier,
    reward,
    netChange: reward - round.bet,
  };
};
