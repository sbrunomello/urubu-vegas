import type { RedisClient } from '@devvit/web/server';
import type {
  GlobalStats,
  LeaderboardEntry,
  LeaderboardKind,
  GameStatsById,
  PlayerRanks,
  UrubuLeaderboards,
  UrubuPlayerState,
} from '../../shared/urubuVegas';
import {
  createDefaultGameStatsById,
  createDefaultPlayer,
  emptyLeaderboards,
  normalizePlayer,
} from '../../shared/urubuVegas';
import { globalStatsKey, leaderboardKey, playerKey } from './redisKeys';

const numberField = (
  row: Record<string, string>,
  field: string,
  fallback: number
): number => {
  const raw = row[field];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const jsonField = <TValue>(
  row: Record<string, string>,
  field: string,
  fallback: TValue
): TValue => {
  const raw = row[field];
  if (raw === undefined) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    return parsed as TValue;
  } catch {
    return fallback;
  }
};

export const deserializePlayer = (
  row: Record<string, string>,
  userId: string,
  username: string,
  now: number
): UrubuPlayerState => {
  if (Object.keys(row).length === 0) return createDefaultPlayer(userId, username, now);
  return normalizePlayer({
    userId: row.userId ?? userId,
    username: row.username ?? username,
    balance: numberField(row, 'balance', 0),
    totalRounds: numberField(row, 'totalRounds', 0),
    totalRewarded: numberField(row, 'totalRewarded', 0),
    totalSpent: numberField(row, 'totalSpent', 0),
    biggestWin: numberField(row, 'biggestWin', 0),
    bestMultiplier: numberField(row, 'bestMultiplier', 0),
    currentStreak: numberField(row, 'currentStreak', 0),
    bestStreak: numberField(row, 'bestStreak', 0),
    statsByGame: jsonField<GameStatsById>(row, 'statsByGame', createDefaultGameStatsById()),
    activeJacareRoundId: row.activeJacareRoundId ?? null,
    createdAt: numberField(row, 'createdAt', now),
    updatedAt: numberField(row, 'updatedAt', now),
  });
};

export const serializePlayer = (
  player: UrubuPlayerState
): Record<string, string> => ({
  userId: player.userId,
  username: player.username,
  balance: String(player.balance),
  totalRounds: String(player.totalRounds),
  totalRewarded: String(player.totalRewarded),
  totalSpent: String(player.totalSpent),
  biggestWin: String(player.biggestWin),
  bestMultiplier: String(player.bestMultiplier),
  currentStreak: String(player.currentStreak),
  bestStreak: String(player.bestStreak),
  statsByGame: JSON.stringify(player.statsByGame),
  activeJacareRoundId: player.activeJacareRoundId ?? '',
  createdAt: String(player.createdAt),
  updatedAt: String(player.updatedAt),
});

export const loadPlayer = async (
  redis: RedisClient,
  userId: string,
  username: string,
  now: number
): Promise<UrubuPlayerState> =>
  deserializePlayer(await redis.hGetAll(playerKey(userId)), userId, username, now);

export const loadGlobalStats = async (redis: RedisClient): Promise<GlobalStats> => {
  const row = await redis.hGetAll(globalStatsKey());
  return {
    communityPlays: numberField(row, 'communityPlays', 0),
    largestRecordedWin: numberField(row, 'largestRecordedWin', 0),
  };
};

export const loadLeaderboards = async (
  redis: RedisClient,
  currentUserId: string
): Promise<{ leaderboards: UrubuLeaderboards; ranks: PlayerRanks }> => {
  const kinds: readonly LeaderboardKind[] = ['richest', 'biggestWin', 'mostPlays'];
  const result = emptyLeaderboards();
  const ranks: PlayerRanks = {};

  await Promise.all(
    kinds.map(async (kind) => {
      const key = leaderboardKey(kind);
      const rows = await redis.zRange(key, 0, 9, { by: 'rank', reverse: true });
      const entries = await Promise.all(
        rows.map(async (row, index): Promise<LeaderboardEntry> => {
          const player = await redis.hGetAll(playerKey(row.member));
          return {
            rank: index + 1,
            userId: row.member,
            username: player.username ?? 'unknown',
            score: row.score,
          };
        })
      );
      result[kind] = entries;

      const [count, ascendingRank] = await Promise.all([
        redis.zCard(key),
        redis.zRank(key, currentUserId),
      ]);
      ranks[kind] =
        typeof ascendingRank === 'number' ? count - ascendingRank : null;
    })
  );

  return { leaderboards: result, ranks };
};
