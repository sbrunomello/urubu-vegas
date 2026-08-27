import type { LeaderboardKind } from '../../shared/urubuVegas';
import { REDIS_KEY_SCHEMA_VERSION } from '../../shared/urubuVegas';

export const playerKey = (userId: string): string =>
  `${REDIS_KEY_SCHEMA_VERSION}:player:${userId}`;

export const idempotencyKey = (userId: string, actionId: string): string =>
  `${REDIS_KEY_SCHEMA_VERSION}:idem:${userId}:${actionId}`;

export const crashRoundKey = (userId: string, roundId: string): string =>
  `${REDIS_KEY_SCHEMA_VERSION}:crash:${userId}:${roundId}`;

export const globalStatsKey = (): string => `${REDIS_KEY_SCHEMA_VERSION}:global`;

export const leaderboardKey = (kind: LeaderboardKind): string =>
  `${REDIS_KEY_SCHEMA_VERSION}:lb:${kind}`;

export const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;
export const CRASH_ROUND_TTL_SECONDS = 60;
