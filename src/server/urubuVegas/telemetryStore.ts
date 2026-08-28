import type { RedisClient } from '@devvit/web/server';
import type { GameId } from '../../shared/urubuVegas';
import { REDIS_KEY_SCHEMA_VERSION } from '../../shared/urubuVegas';
import { loadGlobalStats, loadPlayer } from './playerStore';

const visitorKey = (userId: string): string =>
  `${REDIS_KEY_SCHEMA_VERSION}:telemetry:visitor:${userId}`;
const recentVisitorsKey = (): string =>
  `${REDIS_KEY_SCHEMA_VERSION}:telemetry:recent`;
const telemetryGlobalKey = (): string =>
  `${REDIS_KEY_SCHEMA_VERSION}:telemetry:global`;

const numberField = (
  row: Record<string, string>,
  field: string,
  fallback = 0
): number => {
  const value = Number(row[field]);
  return Number.isFinite(value) ? value : fallback;
};

export type VisitorTelemetry = {
  userId: string;
  username: string;
  firstSeenAt: number;
  lastSeenAt: number;
  opens: number;
  rounds: number;
  bailouts: number;
  lastPostId: string;
  games: Record<GameId, number>;
};

export type TelemetrySummary = {
  uniqueVisitors: number;
  totalOpens: number;
  totalRounds: number;
  totalBailouts: number;
  recent: readonly VisitorTelemetry[];
};

const deserializeVisitor = (
  row: Record<string, string>,
  userId: string
): VisitorTelemetry => ({
  userId,
  username: row.username ?? 'unknown',
  firstSeenAt: numberField(row, 'firstSeenAt'),
  lastSeenAt: numberField(row, 'lastSeenAt'),
  opens: numberField(row, 'opens'),
  rounds: 0,
  bailouts: numberField(row, 'bailouts'),
  lastPostId: row.lastPostId ?? '',
  games: {
    urubuzinho: 0,
    'oncinha-777': 0,
    'jacare-crash': 0,
    'capivara-roulette': 0,
  },
});

export const recordVisitorOpen = async (
  redis: RedisClient,
  input: {
    userId: string;
    username: string;
    postId: string;
    now: number;
  }
): Promise<void> => {
  const key = visitorKey(input.userId);
  const existing = await redis.hGetAll(key);
  if (Object.keys(existing).length === 0) {
    await redis.hSet(key, {
      userId: input.userId,
      username: input.username,
      firstSeenAt: String(input.now),
      lastSeenAt: String(input.now),
      opens: '0',
      bailouts: '0',
      lastPostId: input.postId,
    });
  } else {
    await redis.hSet(key, {
      username: input.username,
      lastSeenAt: String(input.now),
      lastPostId: input.postId,
    });
  }

  await redis.hIncrBy(key, 'opens', 1);
  await redis.hIncrBy(telemetryGlobalKey(), 'totalOpens', 1);
  await redis.zAdd(recentVisitorsKey(), {
    member: input.userId,
    score: input.now,
  });

  console.log(
    `[urubu-vegas][telemetry] open u/${input.username} post=${input.postId}`
  );
};

export const recordBailout = async (
  redis: RedisClient,
  input: { userId: string; username: string; now: number }
): Promise<void> => {
  const key = visitorKey(input.userId);
  await redis.hSet(key, {
    userId: input.userId,
    username: input.username,
    lastSeenAt: String(input.now),
  });
  await redis.hIncrBy(key, 'bailouts', 1);
  await redis.hIncrBy(telemetryGlobalKey(), 'totalBailouts', 1);
  await redis.zAdd(recentVisitorsKey(), {
    member: input.userId,
    score: input.now,
  });
  console.log(`[urubu-vegas][telemetry] bailout u/${input.username}`);
};

export const loadTelemetrySummary = async (
  redis: RedisClient,
  limit = 8
): Promise<TelemetrySummary> => {
  const [global, globalStats, uniqueVisitors, recentRows] = await Promise.all([
    redis.hGetAll(telemetryGlobalKey()),
    loadGlobalStats(redis),
    redis.zCard(recentVisitorsKey()),
    redis.zRange(recentVisitorsKey(), 0, Math.max(0, limit - 1), {
      by: 'rank',
      reverse: true,
    }),
  ]);

  const recent = await Promise.all(
    recentRows.map(async (row) => {
      const visitorRow = await redis.hGetAll(visitorKey(row.member));
      const visitor = deserializeVisitor(visitorRow, row.member);
      const player = await loadPlayer(
        redis,
        row.member,
        visitor.username,
        Date.now()
      );

      return {
        ...visitor,
        rounds: player.totalRounds,
        games: {
          urubuzinho: player.statsByGame.urubuzinho.plays,
          'oncinha-777': player.statsByGame['oncinha-777'].plays,
          'jacare-crash': player.statsByGame['jacare-crash'].plays,
          'capivara-roulette': player.statsByGame['capivara-roulette'].plays,
        },
      };
    })
  );

  return {
    uniqueVisitors,
    totalOpens: numberField(global, 'totalOpens'),
    totalRounds: globalStats.communityPlays,
    totalBailouts: numberField(global, 'totalBailouts'),
    recent,
  };
};
