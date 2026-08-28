import type {
  CapivaraRoulettePlayResponse,
  ErrorResponse,
  GlobalStats,
  JacareCrashCashoutResponse,
  JacareCrashStartResponse,
  OncinhaPlayResponse,
  PlayerRanks,
  RouletteSelection,
  UrubuLeaderboards,
  UrubuPlayerState,
  UrubuzinhoPlayResponse,
  UrubuVegasInitResponse,
} from '../../shared/api';

export type HouseBailoutResponse = {
  type: 'house-bailout';
  player: UrubuPlayerState;
  leaderboards: UrubuLeaderboards;
  ranks: PlayerRanks;
  globalStats: GlobalStats;
  disclaimer: string;
  message: string;
};

const parseError = async (response: Response): Promise<Error> => {
  try {
    const body = (await response.json()) as ErrorResponse;
    return new Error(body.message || `API error: ${response.status}`);
  } catch {
    return new Error(`API error: ${response.status}`);
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const requestJson = async <T>(
  url: string,
  init?: RequestInit,
  attempts = 2
): Promise<T> => {
  let lastError: Error = new Error('Connection hiccup. Try again.');

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (response.ok) return (await response.json()) as T;

      const error = await parseError(response);
      lastError = error;
      const retryableConflict =
        response.status === 409 &&
        /connection hiccup|busy|retry|try again/i.test(error.message);
      const retryable = response.status >= 500 || retryableConflict;
      if (!retryable || attempt === attempts - 1) throw error;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Connection hiccup. Try again.');
      if (attempt === attempts - 1) throw lastError;
    } finally {
      window.clearTimeout(timeout);
    }

    await sleep(140 * (attempt + 1));
  }

  throw lastError;
};

const postJson = async <T>(url: string, body: unknown): Promise<T> =>
  requestJson<T>(
    url,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    2
  );

export const loadUrubuVegas = async (): Promise<UrubuVegasInitResponse> =>
  requestJson<UrubuVegasInitResponse>('/api/init', undefined, 3);

export const playUrubuzinho = async (
  actionId: string,
  bet: number
): Promise<UrubuzinhoPlayResponse> =>
  postJson<UrubuzinhoPlayResponse>('/api/games/urubuzinho/play', {
    actionId,
    bet,
  });

export const playOncinha = async (
  actionId: string,
  bet: number
): Promise<OncinhaPlayResponse> =>
  postJson<OncinhaPlayResponse>('/api/games/oncinha/play', {
    actionId,
    bet,
  });

export const playCapivaraRoulette = async (
  actionId: string,
  bet: number,
  selection: RouletteSelection
): Promise<CapivaraRoulettePlayResponse> =>
  postJson<CapivaraRoulettePlayResponse>('/api/games/capivara/play', {
    actionId,
    bet,
    selection,
  });

export const startJacareCrash = async (
  actionId: string,
  bet: number
): Promise<JacareCrashStartResponse> =>
  postJson<JacareCrashStartResponse>('/api/games/jacare/start', {
    actionId,
    bet,
  });

export const cashoutJacareCrash = async (
  actionId: string,
  roundId: string
): Promise<JacareCrashCashoutResponse> =>
  postJson<JacareCrashCashoutResponse>('/api/games/jacare/cashout', {
    actionId,
    roundId,
  });

export const claimHouseBailout = async (
  actionId: string
): Promise<HouseBailoutResponse> =>
  postJson<HouseBailoutResponse>('/api/house/bailout', { actionId });

export const createActionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (value) => value.toString(16).padStart(8, '0')).join('-');
};
