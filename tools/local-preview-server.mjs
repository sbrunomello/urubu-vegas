import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';

const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const port = portArg ? Number(portArg.split('=')[1]) : 5176;
const root = join(process.cwd(), 'dist', 'client');
const disclaimer = 'Virtual credits only. No purchases, prizes or withdrawals.';
const betValues = [10, 50, 100, 250, 500];

const gameStats = () => ({
  plays: 0,
  wins: 0,
  totalRewarded: 0,
  totalSpent: 0,
  biggestWin: 0,
  bestMultiplier: 0,
});

const player = {
  userId: 'local-preview-user',
  username: 'local_preview',
  balance: 10000,
  totalRounds: 0,
  totalRewarded: 0,
  totalSpent: 0,
  biggestWin: 0,
  bestMultiplier: 0,
  currentStreak: 0,
  bestStreak: 0,
  statsByGame: {
    urubuzinho: gameStats(),
    'oncinha-777': gameStats(),
    'jacare-crash': gameStats(),
    'capivara-roulette': gameStats(),
  },
  activeJacareRoundId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const idempotency = new Map();
const crashRounds = new Map();
const globalStats = { communityPlays: 0, largestRecordedWin: 0 };

const slotConfigs = {
  urubuzinho: {
    responseType: 'urubuzinho-play',
    symbols: [
      ['banana', 24],
      ['coconut', 20],
      ['vulture', 16],
      ['seven', 13],
      ['diamond', 10],
      ['crown', 8],
      ['wild', 5],
      ['scatter', 4],
    ],
    paytable: {
      banana: { 3: 0.45, 4: 1.1, 5: 2.4 },
      coconut: { 3: 0.55, 4: 1.3, 5: 2.8 },
      vulture: { 3: 0.85, 4: 2.2, 5: 5.5 },
      seven: { 3: 1.1, 4: 3.4, 5: 8.5 },
      diamond: { 3: 1.5, 4: 5, 5: 13 },
      crown: { 3: 2, 4: 7, 5: 20 },
      wild: { 3: 2.6, 4: 9, 5: 28 },
    },
    scatter: { 3: 2, 4: 6, 5: 18 },
  },
  'oncinha-777': {
    responseType: 'oncinha-play',
    symbols: [
      ['pearl', 23],
      ['star', 20],
      ['champagne', 16],
      ['oncinha', 14],
      ['seven', 11],
      ['ruby', 9],
      ['wild', 4],
      ['scatter', 3],
    ],
    paytable: {
      pearl: { 3: 0.35, 4: 0.95, 5: 2.1 },
      star: { 3: 0.45, 4: 1.2, 5: 2.9 },
      champagne: { 3: 0.7, 4: 1.9, 5: 4.6 },
      oncinha: { 3: 0.95, 4: 2.8, 5: 7.2 },
      seven: { 3: 1.4, 4: 4.6, 5: 12 },
      ruby: { 3: 2.2, 4: 7.5, 5: 24 },
      wild: { 3: 3.1, 4: 10, 5: 34 },
    },
    scatter: { 3: 2.5, 4: 8, 5: 24 },
  },
};

const paylines = [
  ['top', 'Top row', [0, 0, 0, 0, 0]],
  ['middle', 'Middle row', [1, 1, 1, 1, 1]],
  ['bottom', 'Bottom row', [2, 2, 2, 2, 2]],
  ['v-up', 'V up', [0, 1, 2, 1, 0]],
  ['v-down', 'V down', [2, 1, 0, 1, 2]],
  ['zig', 'Zig', [1, 0, 1, 2, 1]],
  ['zag', 'Zag', [1, 2, 1, 0, 1]],
];

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

const leaderboards = () => ({
  richest: [
    {
      rank: 1,
      userId: player.userId,
      username: player.username,
      score: player.balance,
    },
  ],
  biggestWin: [
    {
      rank: 1,
      userId: player.userId,
      username: player.username,
      score: player.biggestWin,
    },
  ],
  mostPlays: [
    {
      rank: 1,
      userId: player.userId,
      username: player.username,
      score: player.totalRounds,
    },
  ],
});

const commonState = () => ({
  player,
  activeJacareRound: player.activeJacareRoundId
    ? (crashRounds.get(player.activeJacareRoundId) ?? null)
    : null,
  leaderboards: leaderboards(),
  ranks: { richest: 1, biggestWin: 1, mostPlays: 1 },
  globalStats,
  disclaimer,
});

const apiInit = (res) =>
  json(res, 200, {
    type: 'urubu-vegas-init',
    postId: 'local-preview-post',
    ...commonState(),
    betValues,
    games: {
      urubuzinho: { gameId: 'urubuzinho', betValues, disclaimer },
      'oncinha-777': { gameId: 'oncinha-777', betValues, disclaimer },
      'jacare-crash': { gameId: 'jacare-crash', betValues, disclaimer },
      'capivara-roulette': {
        gameId: 'capivara-roulette',
        betValues,
        disclaimer,
      },
    },
  });

const pickSymbol = (config) => {
  const total = config.symbols.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = 0;
  const roll = randomInt(total);
  for (const [symbol, weight] of config.symbols) {
    cursor += weight;
    if (roll < cursor) return symbol;
  }
  return config.symbols[0][0];
};

const generateGrid = (config) =>
  Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => pickSymbol(config))
  );

const baseSymbol = (lineSymbols) => {
  for (const symbol of lineSymbols) {
    if (symbol === 'scatter') return null;
    if (symbol !== 'wild') return symbol;
  }
  return 'wild';
};

const evaluateSlot = (gameId, grid, bet) => {
  const config = slotConfigs[gameId];
  const lineWins = [];
  for (const [id, label, rows] of paylines) {
    const lineSymbols = rows.map((row, reel) => grid[row][reel]);
    const symbol = baseSymbol(lineSymbols);
    if (!symbol) continue;
    const cells = [];
    for (let reel = 0; reel < lineSymbols.length; reel += 1) {
      const current = lineSymbols[reel];
      if (current === 'scatter') break;
      if (symbol === 'wild' && current !== 'wild') break;
      if (symbol !== 'wild' && current !== symbol && current !== 'wild') break;
      cells.push({ row: rows[reel], reel });
    }
    if (cells.length < 3) continue;
    const count = Math.min(cells.length, 5);
    const multiplier = config.paytable[symbol]?.[count];
    if (!multiplier) continue;
    lineWins.push({
      paylineId: id,
      label,
      symbol,
      count,
      multiplier,
      reward: Math.round(bet * multiplier),
      cells,
    });
  }

  const scatterCells = [];
  for (let row = 0; row < 3; row += 1) {
    for (let reel = 0; reel < 5; reel += 1) {
      if (grid[row][reel] === 'scatter') scatterCells.push({ row, reel });
    }
  }
  const scatterCount = Math.min(scatterCells.length, 5);
  const scatterMultiplier =
    scatterCount >= 3 ? config.scatter[scatterCount] : 0;
  const scatterWin = scatterMultiplier
    ? {
        count: scatterCells.length,
        multiplier: scatterMultiplier,
        reward: Math.round(bet * scatterMultiplier),
        cells: scatterCells,
      }
    : null;

  const reward =
    lineWins.reduce((total, win) => total + win.reward, 0) +
    (scatterWin?.reward ?? 0);
  const multiplier = Number((reward / bet).toFixed(2));
  const category =
    multiplier >= 15
      ? 'mega-win'
      : multiplier >= 5
        ? 'big-win'
        : multiplier >= 1
          ? 'win'
          : 'miss';
  return {
    gameId,
    grid,
    bet,
    reward,
    netChange: reward - bet,
    multiplier,
    category,
    lineWins,
    scatterWin,
  };
};

const applyOutcome = (gameId, bet, reward, multiplier) => {
  player.balance = player.balance - bet + reward;
  player.totalRounds += 1;
  player.totalSpent += bet;
  player.totalRewarded += reward;
  player.biggestWin = Math.max(player.biggestWin, reward);
  player.bestMultiplier = Math.max(player.bestMultiplier, multiplier);
  player.currentStreak = reward > 0 ? player.currentStreak + 1 : 0;
  player.bestStreak = Math.max(player.bestStreak, player.currentStreak);
  const stats = player.statsByGame[gameId];
  stats.plays += 1;
  stats.wins += reward > 0 ? 1 : 0;
  stats.totalSpent += bet;
  stats.totalRewarded += reward;
  stats.biggestWin = Math.max(stats.biggestWin, reward);
  stats.bestMultiplier = Math.max(stats.bestMultiplier, multiplier);
  player.updatedAt = Date.now();
  globalStats.communityPlays += 1;
  globalStats.largestRecordedWin = Math.max(
    globalStats.largestRecordedWin,
    reward
  );
};

const apiSlot = async (req, res, gameId) => {
  const body = await readJson(req);
  if (!body.actionId || !betValues.includes(body.bet)) {
    json(res, 400, { status: 'error', message: 'Invalid round request.' });
    return;
  }
  if (idempotency.has(body.actionId)) {
    json(res, 200, { ...idempotency.get(body.actionId), replayed: true });
    return;
  }
  if (player.balance < body.bet) {
    json(res, 402, { status: 'error', message: 'Not enough virtual credits.' });
    return;
  }
  const result = evaluateSlot(
    gameId,
    generateGrid(slotConfigs[gameId]),
    body.bet
  );
  applyOutcome(gameId, result.bet, result.reward, result.multiplier);
  const response = {
    type: slotConfigs[gameId].responseType,
    replayed: false,
    result,
    ...commonState(),
  };
  idempotency.set(body.actionId, response);
  json(res, 200, response);
};

const apiRoulette = async (req, res) => {
  const body = await readJson(req);
  if (!body.actionId || !betValues.includes(body.bet) || !body.selection) {
    json(res, 400, { status: 'error', message: 'Invalid roulette request.' });
    return;
  }
  if (idempotency.has(body.actionId))
    return json(res, 200, {
      ...idempotency.get(body.actionId),
      replayed: true,
    });
  const number = randomInt(37);
  const red = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ]);
  const color = number === 0 ? 'green' : red.has(number) ? 'red' : 'black';
  const selection = body.selection;
  const won =
    selection.kind === 'single'
      ? selection.number === number
      : number !== 0 &&
        (selection.kind === color ||
          (selection.kind === 'odd' && number % 2 === 1) ||
          (selection.kind === 'even' && number % 2 === 0) ||
          (selection.kind === 'low' && number <= 18) ||
          (selection.kind === 'high' && number >= 19));
  const multiplier = selection.kind === 'single' ? 36 : 2;
  const reward = won ? body.bet * multiplier : 0;
  const result = {
    gameId: 'capivara-roulette',
    bet: body.bet,
    selection,
    number,
    color,
    reward,
    netChange: reward - body.bet,
    multiplier: won ? multiplier : 0,
    won,
  };
  applyOutcome('capivara-roulette', body.bet, reward, result.multiplier);
  const response = {
    type: 'capivara-roulette-play',
    replayed: false,
    result,
    ...commonState(),
  };
  idempotency.set(body.actionId, response);
  json(res, 200, response);
};

const apiCrashStart = async (req, res) => {
  const body = await readJson(req);
  if (!body.actionId || !betValues.includes(body.bet))
    return json(res, 400, {
      status: 'error',
      message: 'Invalid crash start request.',
    });
  if (player.activeJacareRoundId)
    return json(res, 409, {
      status: 'error',
      message: 'Finish the active Jacare round first.',
    });
  if (player.balance < body.bet)
    return json(res, 402, {
      status: 'error',
      message: 'Not enough virtual credits.',
    });
  const roll = randomInt(1_000_000);
  const crashPoint =
    roll < 42_000
      ? 1
      : Number(
          Math.min(
            25,
            Math.max(1.01, 0.96 / (1 - (roll + 1) / 1_000_001))
          ).toFixed(2)
        );
  const round = {
    roundId: `jacare:${randomUUID()}`,
    userId: player.userId,
    bet: body.bet,
    crashPoint,
    startedAt: Date.now(),
    crashAt: Date.now() + Math.max(0, Math.round((crashPoint - 1) * 1050)),
    completed: false,
  };
  player.balance -= body.bet;
  player.totalRounds += 1;
  player.totalSpent += body.bet;
  player.statsByGame['jacare-crash'].plays += 1;
  player.statsByGame['jacare-crash'].totalSpent += body.bet;
  player.activeJacareRoundId = round.roundId;
  crashRounds.set(round.roundId, round);
  json(res, 200, {
    type: 'jacare-crash-start',
    replayed: false,
    round,
    player,
    activeJacareRound: round,
    disclaimer,
  });
};

const apiCrashCashout = async (req, res) => {
  const body = await readJson(req);
  const round = crashRounds.get(body.roundId);
  if (!round || round.completed)
    return json(res, 404, {
      status: 'error',
      message: 'Crash round not found.',
    });
  const now = Date.now();
  const multiplier = Math.min(
    25,
    Number((1 + Math.max(0, now - round.startedAt) / 1050).toFixed(2))
  );
  const crashed = now >= round.crashAt || multiplier >= round.crashPoint;
  const reward = crashed ? 0 : Math.round(round.bet * multiplier);
  const result = {
    status: crashed ? 'crashed' : 'cashed-out',
    multiplier: crashed ? round.crashPoint : multiplier,
    reward,
    netChange: reward - round.bet,
  };
  round.completed = true;
  player.activeJacareRoundId = null;
  player.balance += reward;
  player.totalRewarded += reward;
  player.biggestWin = Math.max(player.biggestWin, reward);
  player.bestMultiplier = Math.max(player.bestMultiplier, result.multiplier);
  const stats = player.statsByGame['jacare-crash'];
  stats.wins += reward > 0 ? 1 : 0;
  stats.totalRewarded += reward;
  stats.biggestWin = Math.max(stats.biggestWin, reward);
  stats.bestMultiplier = Math.max(stats.bestMultiplier, result.multiplier);
  globalStats.communityPlays += 1;
  globalStats.largestRecordedWin = Math.max(
    globalStats.largestRecordedWin,
    reward
  );
  json(res, 200, {
    type: 'jacare-crash-cashout',
    replayed: false,
    roundId: round.roundId,
    result,
    ...commonState(),
  });
};

const mime = (file) =>
  ({
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.map': 'application/json',
  })[extname(file)] ?? 'application/octet-stream';

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/init' || url.pathname === '/api/profile')
      return apiInit(res);
    if (url.pathname === '/api/leaderboards') return apiInit(res);
    if (url.pathname === '/api/urubu-vegas/init') return apiInit(res);
    if (url.pathname === '/api/urubu-vegas/leaderboards') return apiInit(res);
    if (url.pathname === '/api/games/urubuzinho/play' && req.method === 'POST')
      return apiSlot(req, res, 'urubuzinho');
    if (
      (url.pathname === '/api/games/oncinha/play' ||
        url.pathname === '/api/games/oncinha-777/play') &&
      req.method === 'POST'
    )
      return apiSlot(req, res, 'oncinha-777');
    if (
      (url.pathname === '/api/games/capivara/play' ||
        url.pathname === '/api/games/capivara-roulette/play') &&
      req.method === 'POST'
    )
      return apiRoulette(req, res);
    if (url.pathname === '/api/games/jacare/start' && req.method === 'POST')
      return apiCrashStart(req, res);
    if (url.pathname === '/api/games/jacare/cashout' && req.method === 'POST')
      return apiCrashCashout(req, res);

    const requested = url.pathname === '/' ? '/splash.html' : url.pathname;
    const file = normalize(join(root, requested));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const content = await readFile(file);
    res.writeHead(200, { 'content-type': mime(file) });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Urubu Vegas local preview: http://127.0.0.1:${port}/game.html`);
});
