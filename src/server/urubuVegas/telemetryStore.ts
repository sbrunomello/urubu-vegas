import type { RedisClient } from '@devvit/web/server';
import type { GameId } from '../../shared/urubuVegas';
import { REDIS_KEY_SCHEMA_VERSION } from '../../shared/urubuVegas';

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
  rounds: numberField(row, 'rounds'),
  bailouts: numberField(row, 'bailouts'),
  lastPostId: row.lastPostId ?? '',
  games: {
    urubuzinho: numberField(row, 'game:urubuzinho'),
    'oncinha-777': numberField(row, 'game:oncinha-777'),
    'jacare-crash': numberField(row, 'game:jacare-crash'),
    'capivara-roulette': numberField(row, 'game:capivara-roulette'),
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
      rounds: '0',
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

export const recordRound = async (
  redis: RedisClient,
  input: {
    userId: string;
    username: string;
    gameId: GameId;
    now: number;
  }
): Promise<void> => {
  const key = visitorKey(input.userId);
  await redis.hSet(key, {
    userId: input.userId,
    username: input.username,
    lastSeenAt: String(input.now),
  });
  await redis.hIncrBy(key, 'rounds', 1);
  await redis.hIncrBy(key, `game:${input.gameId}`, 1);
  await redis.hIncrBy(telemetryGlobalKey(), 'totalRounds', 1);
  await redis.zAdd(recentVisitorsKey(), {
    member: input.userId,
    score: input.now,
  });
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
  const [global, uniqueVisitors, recentRows] = await Promise.all([
    redis.hGetAll(telemetryGlobalKey()),
    redis.zCard(recentVisitorsKey()),
    redis.zRange(recentVisitorsKey(), 0, Math.max(0, limit - 1), {
      by: 'rank',
      reverse: true,
    }),
  ]);

  const recent = await Promise.all(
    recentRows.map(async (row) =>
      deserializeVisitor(await redis.hGetAll(visitorKey(row.member)), row.member)
    )
  );

  return {
    uniqueVisitors,
    totalOpens: numberField(global, 'totalOpens'),
    totalRounds: numberField(global, 'totalRounds'),
    totalBailouts: numberField(global, 'totalBailouts'),
    recent,
  };
};
