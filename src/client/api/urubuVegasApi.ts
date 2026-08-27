import type {
  CapivaraRoulettePlayResponse,
  ErrorResponse,
  JacareCrashCashoutResponse,
  JacareCrashStartResponse,
  OncinhaPlayResponse,
  RouletteSelection,
  UrubuzinhoPlayResponse,
  UrubuVegasInitResponse,
} from '../../shared/api';

const parseError = async (response: Response): Promise<Error> => {
  try {
    const body = (await response.json()) as ErrorResponse;
    return new Error(body.message || `API error: ${response.status}`);
  } catch {
    return new Error(`API error: ${response.status}`);
  }
};

export const loadUrubuVegas = async (): Promise<UrubuVegasInitResponse> => {
  const response = await fetch('/api/init');
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as UrubuVegasInitResponse;
};

export const playUrubuzinho = async (
  actionId: string,
  bet: number
): Promise<UrubuzinhoPlayResponse> => {
  const response = await fetch('/api/games/urubuzinho/play', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ actionId, bet }),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as UrubuzinhoPlayResponse;
};

export const playOncinha = async (
  actionId: string,
  bet: number
): Promise<OncinhaPlayResponse> => {
  const response = await fetch('/api/games/oncinha/play', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ actionId, bet }),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as OncinhaPlayResponse;
};

export const playCapivaraRoulette = async (
  actionId: string,
  bet: number,
  selection: RouletteSelection
): Promise<CapivaraRoulettePlayResponse> => {
  const response = await fetch('/api/games/capivara/play', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ actionId, bet, selection }),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as CapivaraRoulettePlayResponse;
};

export const startJacareCrash = async (
  actionId: string,
  bet: number
): Promise<JacareCrashStartResponse> => {
  const response = await fetch('/api/games/jacare/start', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ actionId, bet }),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as JacareCrashStartResponse;
};

export const cashoutJacareCrash = async (
  actionId: string,
  roundId: string
): Promise<JacareCrashCashoutResponse> => {
  const response = await fetch('/api/games/jacare/cashout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ actionId, roundId }),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as JacareCrashCashoutResponse;
};

export const createActionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (value) => value.toString(16).padStart(8, '0')).join('-');
};
