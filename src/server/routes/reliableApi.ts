import { randomInt, randomUUID } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  CapivaraRoulettePlayResponse,
  ErrorResponse,
  GameId,
  JacareCrashCashoutResponse,
  JacareCrashStartResponse,
  OncinhaPlayResponse,
  UrubuzinhoPlayResponse,
  UrubuVegasInitResponse,
} from '../../shared/api';
import {
  gameInitPayloads,
  getBetValues,
  URUBU_VEGAS_DISCLAIMER,
} from '../../shared/api';
import {
  deserializePlayer,
  loadGlobalStats,
  loadLeaderboards,
  loadPlayer,
  serializePlayer,
} from '../urubuVegas/playerStore';
import {
  crashRoundKey,
  CRASH_ROUND_TTL_SECONDS,
  globalStatsKey,
  idempotencyKey,
  IDEMPOTENCY_TTL_SECONDS,
  leaderboardKey,
  playerKey,
} from '../urubuVegas/redisKeys';
import {
  processJacareCashout,
  processJacareStart,
  processOncinhaRound,
  processRouletteRound,
  processUrubuzinhoRound,
  type ProcessBaseInput,
  type StoredRoundSnapshot,
} from '../urubuVegas/roundService';
import type { JacareCrashRound } from '../../shared/games/jacareCrash/CrashEngine';

export const reliableApi = new Hono();

type PlayerIdentity = {
  userId: string;
  username: string;
};

const getIdentity = async (): Promise<PlayerIdentity | null> => {
  const user = await reddit.getCurrentUser();
  if (!user) return null;
  return { userId: user.id, username: user.username };
};

const authError = (
  message = 'Reddit login is required to play.'
): ErrorResponse => ({ status: 'error', message });

const parseStoredSnapshot = <TResult>(
  raw: string | undefined
): StoredRoundSnapshot<TResult> | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!('result' in parsed) || !('player' in parsed)) return null;
    return parsed as StoredRoundSnapshot<TResult>;
  } catch {
    return null;
  }
};

const parseCrashRound = (raw: string | undefined): JacareCrashRound | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!('roundId' in parsed) || !('userId' in parsed) || !('bet' in parsed)) {
      return null;
    }
    return parsed as JacareCrashRound;
  } catch {
    return null;
  }
};

const buildInitPayload = async (
  identity: PlayerIdentity,
  postId: string
): Promise<UrubuVegasInitResponse> => {
  const now = Date.now();
  const player = await loadPlayer(redis, identity.userId, identity.username, now);
  let normalizedPlayer = { ...player, username: identity.username };
  let activeJacareRound: JacareCrashRound | null = null;

  if (normalizedPlayer.activeJacareRoundId) {
    activeJacareRound = parseCrashRound(
      await redis.get(
        crashRoundKey(identity.userId, normalizedPlayer.activeJacareRoundId)
      )
    );
    if (!activeJacareRound || activeJacareRound.completed) {
      normalizedPlayer = {
        ...normalizedPlayer,
        activeJacareRoundId: null,
        updatedAt: now,
      };
      activeJacareRound = null;
    }
  }

  if (
    player.username !== identity.username ||
    player.createdAt === now ||
    player.activeJacareRoundId !== normalizedPlayer.activeJacareRoundId
  ) {
    await redis.hSet(playerKey(identity.userId), serializePlayer(normalizedPlayer));
  }

  const [{ leaderboards, ranks }, globalStats] = await Promise.all([
    loadLeaderboards(redis, identity.userId),
    loadGlobalStats(redis),
  ]);

  return {
    type: 'urubu-vegas-init',
    postId,
    player: normalizedPlayer,
    activeJacareRound,
    leaderboards,
    ranks,
    globalStats,
    betValues: getBetValues('urubuzinho'),
    games: gameInitPayloads(),
    disclaimer: URUBU_VEGAS_DISCLAIMER,
  };
};

const loadSecondaryState = async (userId: string) => {
  const [{ leaderboards, ranks }, globalStats] = await Promise.all([
    loadLeaderboards(redis, userId),
    loadGlobalStats(redis),
  ]);
  return { leaderboards, ranks, globalStats };
};

const updateLeaderboards = async (
  userId: string,
  player: UrubuzinhoPlayResponse['player']
): Promise<void> => {
  await Promise.all([
    redis.zAdd(leaderboardKey('richest'), {
      member: userId,
      score: player.balance,
    }),
    redis.zAdd(leaderboardKey('biggestWin'), {
      member: userId,
      score: player.biggestWin,
    }),
    redis.zAdd(leaderboardKey('mostPlays'), {
      member: userId,
      score: player.totalRounds,
    }),
  ]);
};

const updateLargestRecordedWin = async (reward: number): Promise<void> => {
  if (reward <= 0) return;
  const key = globalStatsKey();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const tx = await redis.watch(key);
    const row = await tx.hGetAll(key);
    const current = Number(row.largestRecordedWin ?? 0);
    if (Number.isFinite(current) && current >= reward) {
      await tx.unwatch();
      return;
    }

    await tx.multi();
    await tx.hSet(key, { largestRecordedWin: String(reward) });
    try {
      await tx.exec();
      return;
    } catch (error) {
      if (attempt === 3) {
        console.warn('[urubu-vegas] largest-win index update skipped:', error);
      }
    }
  }
};

const applySecondaryStats = async (
  userId: string,
  player: UrubuzinhoPlayResponse['player'],
  reward: number
): Promise<void> => {
  try {
    // Shared/global counters are intentionally outside the player transaction.
    // A busy casino must never make one player's balance transaction conflict
    // with an unrelated player's round.
    await redis.hIncrBy(globalStatsKey(), 'communityPlays', 1);
    await Promise.all([
      updateLargestRecordedWin(reward),
      updateLeaderboards(userId, player),
    ]);
  } catch (error) {
    console.warn('[urubu-vegas] secondary stats update failed:', error);
  }
};

const rewardFromResult = (result: unknown): number => {
  if (typeof result !== 'object' || result === null || !('reward' in result)) {
    return 0;
  }
  return typeof result.reward === 'number' ? result.reward : 0;
};

reliableApi.get('/init', async (c) => {
  const postId = context.postId;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Missing post context.' },
      400
    );
  }

  try {
    const identity = await getIdentity();
    if (!identity) return c.json<ErrorResponse>(authError(), 401);
    return c.json<UrubuVegasInitResponse>(await buildInitPayload(identity, postId));
  } catch (error) {
    console.error('Urubu Vegas init failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Connection hiccup. Try again.' },
      500
    );
  }
});

reliableApi.get('/profile', async (c) => {
  const postId = context.postId;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Missing post context.' },
      400
    );
  }

  try {
    const identity = await getIdentity();
    if (!identity) return c.json<ErrorResponse>(authError(), 401);
    return c.json<UrubuVegasInitResponse>(await buildInitPayload(identity, postId));
  } catch (error) {
    console.error('Urubu Vegas profile load failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not load profile.' },
      500
    );
  }
});

reliableApi.get('/leaderboards', async (c) => {
  try {
    const identity = await getIdentity();
    if (!identity) return c.json<ErrorResponse>(authError(), 401);
    return c.json(await loadSecondaryState(identity.userId));
  } catch (error) {
    console.error('Urubu Vegas leaderboard load failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not load leaderboards.' },
      500
    );
  }
});

reliableApi.get('/urubu-vegas/init', async (c) => {
  const postId = context.postId;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Missing post context.' },
      400
    );
  }
  const identity = await getIdentity();
  if (!identity) return c.json<ErrorResponse>(authError(), 401);
  return c.json<UrubuVegasInitResponse>(await buildInitPayload(identity, postId));
});

reliableApi.get('/urubu-vegas/leaderboards', async (c) => {
  const identity = await getIdentity();
  if (!identity) return c.json<ErrorResponse>(authError(), 401);
  return c.json(await loadSecondaryState(identity.userId));
});

reliableApi.get('/games/:gameId/init', (c) => {
  const gameId = c.req.param('gameId') as GameId;
  const payload = gameInitPayloads()[gameId];
  if (!payload) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unknown game.' },
      404
    );
  }
  return c.json(payload);
});

reliableApi.post('/games/urubuzinho/play', async (c) =>
  playTransacted<UrubuzinhoPlayResponse['result'], UrubuzinhoPlayResponse>(
    c,
    processUrubuzinhoRound
  )
);

reliableApi.post('/games/oncinha/play', async (c) =>
  playTransacted<OncinhaPlayResponse['result'], OncinhaPlayResponse>(
    c,
    processOncinhaRound
  )
);

reliableApi.post('/games/oncinha-777/play', async (c) =>
  playTransacted<OncinhaPlayResponse['result'], OncinhaPlayResponse>(
    c,
    processOncinhaRound
  )
);

reliableApi.post('/games/capivara/play', async (c) =>
  playTransacted<
    CapivaraRoulettePlayResponse['result'],
    CapivaraRoulettePlayResponse
  >(c, processRouletteRound)
);

reliableApi.post('/games/capivara-roulette/play', async (c) =>
  playTransacted<
    CapivaraRoulettePlayResponse['result'],
    CapivaraRoulettePlayResponse
  >(c, processRouletteRound)
);

reliableApi.post('/games/jacare/start', async (c) => {
  const postId = context.postId;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Missing post context.' },
      400
    );
  }

  try {
    const identity = await getIdentity();
    if (!identity) return c.json<ErrorResponse>(authError(), 401);
    const requestBody = await c.req.json<unknown>();
    if (
      typeof requestBody !== 'object' ||
      requestBody === null ||
      !('actionId' in requestBody) ||
      typeof requestBody.actionId !== 'string'
    ) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Invalid crash start request.' },
        400
      );
    }

    const actionId = requestBody.actionId;
    const idemKey = idempotencyKey(identity.userId, actionId);
    const pKey = playerKey(identity.userId);
    const roundId = `jacare:${randomUUID()}`;
    const roundKey = crashRoundKey(identity.userId, roundId);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const now = Date.now();
      const tx = await redis.watch(pKey, idemKey);
      const existingSnapshot = parseStoredSnapshot<JacareCrashRound>(
        await tx.get(idemKey)
      );
      const player = deserializePlayer(
        await tx.hGetAll(pKey),
        identity.userId,
        identity.username,
        now
      );
      let playablePlayer = { ...player, username: identity.username };

      if (playablePlayer.activeJacareRoundId) {
        const activeRound = parseCrashRound(
          await redis.get(
            crashRoundKey(identity.userId, playablePlayer.activeJacareRoundId)
          )
        );
        if (!activeRound || activeRound.completed) {
          playablePlayer = {
            ...playablePlayer,
            activeJacareRoundId: null,
            updatedAt: now,
          };
        }
      }

      const processed = processJacareStart({
        request: requestBody,
        player: playablePlayer,
        existingSnapshot,
        randomInt: (maxExclusive) => randomInt(maxExclusive),
        now,
        userId: identity.userId,
        roundId,
      });

      if (!processed.ok) {
        await tx.unwatch();
        return c.json<ErrorResponse>(
          { status: 'error', message: processed.message },
          processed.status
        );
      }
      if (processed.replayed) {
        await tx.unwatch();
        return c.json<JacareCrashStartResponse>(processed.response);
      }

      await tx.multi();
      await tx.hSet(pKey, serializePlayer(processed.snapshot.player));
      await tx.set(idemKey, JSON.stringify(processed.snapshot));
      await tx.expire(idemKey, IDEMPOTENCY_TTL_SECONDS);
      await tx.set(roundKey, JSON.stringify(processed.snapshot.result));
      await tx.expire(roundKey, CRASH_ROUND_TTL_SECONDS);

      try {
        await tx.exec();
      } catch (error) {
        console.warn('Jacare start player conflict, retrying:', error);
        continue;
      }

      try {
        await updateLeaderboards(identity.userId, processed.snapshot.player);
      } catch (error) {
        console.warn('[urubu-vegas] Jacare leaderboard update failed:', error);
      }
      return c.json<JacareCrashStartResponse>(processed.response);
    }

    return c.json<ErrorResponse>(
      { status: 'error', message: 'Connection hiccup. Try again.' },
      409
    );
  } catch (error) {
    console.error('Jacare start failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Connection hiccup. Try again.' },
      500
    );
  }
});

reliableApi.post('/games/jacare/cashout', async (c) => {
  const postId = context.postId;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Missing post context.' },
      400
    );
  }

  try {
    const identity = await getIdentity();
    if (!identity) return c.json<ErrorResponse>(authError(), 401);
    const requestBody = await c.req.json<unknown>();
    if (
      typeof requestBody !== 'object' ||
      requestBody === null ||
      !('actionId' in requestBody) ||
      !('roundId' in requestBody) ||
      typeof requestBody.actionId !== 'string' ||
      typeof requestBody.roundId !== 'string'
    ) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Invalid crash cashout request.' },
        400
      );
    }

    const actionId = requestBody.actionId;
    const roundId = requestBody.roundId;
    const idemKey = idempotencyKey(identity.userId, actionId);
    const pKey = playerKey(identity.userId);
    const cKey = crashRoundKey(identity.userId, roundId);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const now = Date.now();
      const tx = await redis.watch(pKey, idemKey, cKey);
      const existingSnapshot = parseStoredSnapshot<
        JacareCrashCashoutResponse['result']
      >(await tx.get(idemKey));
      const player = deserializePlayer(
        await tx.hGetAll(pKey),
        identity.userId,
        identity.username,
        now
      );
      const round = parseCrashRound(await tx.get(cKey));
      const secondary = await loadSecondaryState(identity.userId);

      const processed = processJacareCashout({
        request: requestBody,
        player: { ...player, username: identity.username },
        existingSnapshot,
        round,
        now,
        ...secondary,
      });

      if (!processed.ok) {
        await tx.unwatch();
        return c.json<ErrorResponse>(
          { status: 'error', message: processed.message },
          processed.status
        );
      }
      if (processed.replayed) {
        await tx.unwatch();
        return c.json<JacareCrashCashoutResponse>(processed.response);
      }

      await tx.multi();
      await tx.hSet(pKey, serializePlayer(processed.snapshot.player));
      await tx.set(idemKey, JSON.stringify(processed.snapshot));
      await tx.expire(idemKey, IDEMPOTENCY_TTL_SECONDS);
      await tx.set(cKey, JSON.stringify(processed.round));
      await tx.expire(cKey, CRASH_ROUND_TTL_SECONDS);

      try {
        await tx.exec();
      } catch (error) {
        console.warn('Jacare cashout player conflict, retrying:', error);
        continue;
      }

      await applySecondaryStats(
        identity.userId,
        processed.snapshot.player,
        processed.snapshot.result.reward
      );
      const fresh = await loadSecondaryState(identity.userId).catch(() => secondary);

      return c.json<JacareCrashCashoutResponse>({
        ...processed.response,
        ...fresh,
      });
    }

    return c.json<ErrorResponse>(
      { status: 'error', message: 'Connection hiccup. Try again.' },
      409
    );
  } catch (error) {
    console.error('Jacare cashout failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Connection hiccup. Try again.' },
      500
    );
  }
});

const playTransacted = async <TResult, TResponse extends { result: TResult }>(
  c: Context,
  processRound: (input: ProcessBaseInput) =>
    | {
        ok: true;
        response: TResponse;
        snapshot: StoredRoundSnapshot<TResult>;
        replayed: boolean;
      }
    | { ok: false; status: 400 | 402 | 409; message: string }
) => {
  const postId = context.postId;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Missing post context.' },
      400
    );
  }

  try {
    const identity = await getIdentity();
    if (!identity) return c.json<ErrorResponse>(authError(), 401);
    const requestBody = await c.req.json<unknown>();
    if (
      typeof requestBody !== 'object' ||
      requestBody === null ||
      !('actionId' in requestBody) ||
      typeof requestBody.actionId !== 'string'
    ) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Invalid round request.' },
        400
      );
    }

    const actionId = requestBody.actionId;
    const idemKey = idempotencyKey(identity.userId, actionId);
    const pKey = playerKey(identity.userId);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const now = Date.now();
      const tx = await redis.watch(pKey, idemKey);
      const existingSnapshot = parseStoredSnapshot<TResult>(await tx.get(idemKey));
      const player = deserializePlayer(
        await tx.hGetAll(pKey),
        identity.userId,
        identity.username,
        now
      );
      const secondary = await loadSecondaryState(identity.userId);

      const processed = processRound({
        request: requestBody,
        player: { ...player, username: identity.username },
        existingSnapshot,
        randomInt: (maxExclusive) => randomInt(maxExclusive),
        now,
        ...secondary,
      });

      if (!processed.ok) {
        await tx.unwatch();
        return c.json<ErrorResponse>(
          { status: 'error', message: processed.message },
          processed.status
        );
      }
      if (processed.replayed) {
        await tx.unwatch();
        return c.json<TResponse>(processed.response);
      }

      await tx.multi();
      await tx.hSet(pKey, serializePlayer(processed.snapshot.player));
      await tx.set(idemKey, JSON.stringify(processed.snapshot));
      await tx.expire(idemKey, IDEMPOTENCY_TTL_SECONDS);

      try {
        await tx.exec();
      } catch (error) {
        console.warn('Game player transaction conflict, retrying:', error);
        continue;
      }

      await applySecondaryStats(
        identity.userId,
        processed.snapshot.player,
        rewardFromResult(processed.snapshot.result)
      );
      const fresh = await loadSecondaryState(identity.userId).catch(() => secondary);

      return c.json<TResponse>({
        ...processed.response,
        ...fresh,
      });
    }

    return c.json<ErrorResponse>(
      { status: 'error', message: 'Connection hiccup. Try again.' },
      409
    );
  } catch (error) {
    console.error('Game play failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Connection hiccup. Try again.' },
      500
    );
  }
};
