import { Hono, type MiddlewareHandler } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { URUBU_VEGAS_DISCLAIMER } from '../../shared/urubuVegas';
import {
  deserializePlayer,
  loadGlobalStats,
  loadLeaderboards,
  serializePlayer,
} from '../urubuVegas/playerStore';
import {
  IDEMPOTENCY_TTL_SECONDS,
  idempotencyKey,
  leaderboardKey,
  playerKey,
} from '../urubuVegas/redisKeys';
import {
  recordBailout,
  recordVisitorOpen,
} from '../urubuVegas/telemetryStore';

export const extras = new Hono();

const getIdentity = async (): Promise<{
  userId: string;
  username: string;
} | null> => {
  const user = await reddit.getCurrentUser();
  if (!user) return null;
  return { userId: user.id, username: user.username };
};

export const telemetryMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  if (c.req.path !== '/api/init' || c.res.status >= 400) return;

  try {
    const identity = await getIdentity();
    const postId = context.postId;
    if (!identity || !postId) return;
    await recordVisitorOpen(redis, {
      ...identity,
      postId,
      now: Date.now(),
    });
  } catch (error) {
    // Telemetry is deliberately best-effort. It must never block gameplay.
    console.warn('[urubu-vegas][telemetry] failed to record open:', error);
  }
};

const humiliationLines = [
  'BANKRUPT ON FAKE MONEY. IMPRESSIVE. THE HOUSE SLIDES YOU $5,000.',
  'THE URUBU HAS SEEN BETTER FINANCIAL PLANS FROM A PIGEON. +$5,000.',
  'ZERO CREDITS? THE HOUSE FOUND $5,000 UNDER THE COUCH FOR YOU.',
  'CONGRATS. YOU LOST PIXEL MONEY. HERE IS ANOTHER $5,000, CHAMP.',
  'THE CAPYBARA IS JUDGING YOU SILENTLY. EMERGENCY $5,000 APPROVED.',
] as const;

const buildBailoutResponse = async (
  userId: string,
  username: string,
  message: string
) => {
  const now = Date.now();
  const player = deserializePlayer(
    await redis.hGetAll(playerKey(userId)),
    userId,
    username,
    now
  );
  const [{ leaderboards, ranks }, globalStats] = await Promise.all([
    loadLeaderboards(redis, userId),
    loadGlobalStats(redis),
  ]);

  return {
    type: 'house-bailout' as const,
    player,
    leaderboards,
    ranks,
    globalStats,
    disclaimer: URUBU_VEGAS_DISCLAIMER,
    message,
  };
};

extras.post('/house/bailout', async (c) => {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return c.json(
        { status: 'error', message: 'Reddit login is required.' },
        401
      );
    }

    const body = await c.req.json<unknown>();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('actionId' in body) ||
      typeof body.actionId !== 'string' ||
      body.actionId.length < 12 ||
      body.actionId.length > 96
    ) {
      return c.json(
        { status: 'error', message: 'Invalid bailout request.' },
        400
      );
    }

    const pKey = playerKey(identity.userId);
    const idemKey = idempotencyKey(identity.userId, `bailout:${body.actionId}`);
    const message = humiliationLines[Date.now() % humiliationLines.length] ?? humiliationLines[0];

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const now = Date.now();
      const tx = await redis.watch(pKey, idemKey);
      const replayed = await redis.get(idemKey);

      if (replayed) {
        await tx.unwatch();
        return c.json(
          await buildBailoutResponse(identity.userId, identity.username, replayed)
        );
      }

      const player = deserializePlayer(
        await redis.hGetAll(pKey),
        identity.userId,
        identity.username,
        now
      );

      if (player.balance !== 0) {
        await tx.unwatch();
        return c.json(
          {
            status: 'error',
            message: 'THE HOUSE ONLY BAILS OUT A TRUE ZERO-BALANCE DISASTER.',
          },
          409
        );
      }

      const rescuedPlayer = {
        ...player,
        username: identity.username,
        balance: 5000,
        updatedAt: now,
      };

      await tx.multi();
      await tx.hSet(pKey, serializePlayer(rescuedPlayer));
      await tx.set(idemKey, message);
      await tx.expire(idemKey, IDEMPOTENCY_TTL_SECONDS);

      try {
        await tx.exec();
      } catch (error) {
        console.warn('House bailout transaction conflict, retrying:', error);
        continue;
      }

      // Non-critical indexes/telemetry are updated after the balance commit so
      // they can never make the bailout fail after credits were already granted.
      try {
        await redis.zAdd(leaderboardKey('richest'), {
          member: identity.userId,
          score: rescuedPlayer.balance,
        });
        await recordBailout(redis, { ...identity, now });
      } catch (error) {
        console.warn('[urubu-vegas] bailout secondary update failed:', error);
      }

      return c.json(
        await buildBailoutResponse(identity.userId, identity.username, message)
      );
    }

    return c.json(
      { status: 'error', message: 'THE CASHIER IS BUSY. TRY AGAIN.' },
      409
    );
  } catch (error) {
    console.error('House bailout failed:', error);
    return c.json(
      { status: 'error', message: 'THE CASHIER WINDOW JAMMED. TRY AGAIN.' },
      500
    );
  }
});
