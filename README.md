# Urubu Vegas

Urubu Vegas is a Devvit Web arcade-casino parody for Reddit Custom Posts.

It uses **virtual game credits only**. There are no purchases, deposits, prizes, withdrawals, transfers, crypto, external rewards, or real-money mechanics.

> Virtual credits only. No purchases, prizes or withdrawals.

## Stack

- Devvit Web `0.14.0`
- Phaser `4.2.1`
- Vite `8.1.5`
- TypeScript `6.0.3`
- Hono server endpoints
- Devvit Redis and Reddit APIs

## Product

The app is built as a small multi-game platform. Current local build ships four playable virtual-credit games:

- **Urubuzinho**: a 5 reels x 3 rows fictional arcade slot.
- **Oncinha 777**: a distinct 5 reels x 3 rows slot with its own symbols, weights and paytable.
- **Jacare Crash**: server-authoritative start/cashout crash round.
- **Capivara Roulette**: server-resolved European-style wheel selections.

## Architecture

```text
Inline Custom Post
  -> trusted click via requestExpandedMode(event, "game")
Expanded Phaser app
  -> CasinoLobby
  -> UrubuzinhoGame
  -> /api/games/urubuzinho/play
  -> Oncinha777Game
  -> /api/games/oncinha/play
  -> JacareCrashGame
  -> /api/games/jacare/start + /api/games/jacare/cashout
  -> CapivaraRouletteGame
  -> /api/games/capivara/play
Devvit server
  -> validates user, actionId and bet
  -> generates server-side result with crypto.randomInt
  -> updates Redis in a watched transaction
  -> returns result for client animation
```

Client code lives in `src/client`. Server code lives in `src/server`. Shared contracts and the pure slot engine live in `src/shared`.

## Games

- Fixed bet whitelist: `10`, `50`, `100`, `250`, `500`.
- Starting balance: `10,000` virtual credits.
- Urubuzinho and Oncinha use server-generated 5x3 grids.
- WILD substitutes normal symbols on slot paylines.
- SCATTER pays anywhere with 3+ symbols.
- Jacare Crash debits the start bet and credits only server-confirmed cashouts.
- Capivara Roulette supports red, black, odd, even, low, high, zero and single-number picks.
- The client never decides grid, payout, roulette number, crash cashout, balance, rank or stats.

## Redis Schema

Keys are versioned with `uv:v1`.

- `uv:v1:player:{userId}`: player hash.
- `uv:v1:idem:{userId}:{actionId}`: idempotency snapshot, 24h TTL.
- `uv:v1:crash:{userId}:{roundId}`: active/completed crash round snapshot, short TTL.
- `uv:v1:global`: global community stats hash.
- `uv:v1:lb:richest`: sorted set by balance.
- `uv:v1:lb:biggestWin`: sorted set by biggest single win.
- `uv:v1:lb:mostPlays`: sorted set by total rounds.

## Endpoints

- `GET /api/init`
- `GET /api/profile`
- `GET /api/leaderboards`
- `GET /api/games/:gameId/init`
- `POST /api/games/urubuzinho/play`
- `POST /api/games/oncinha/play`
- `POST /api/games/jacare/start`
- `POST /api/games/jacare/cashout`
- `POST /api/games/capivara/play`
- `POST /internal/menu/post-create`
- `POST /internal/triggers/on-app-install`

## Commands

```bash
npm install
npm run test:types
npm run lint
npm run test:unit
npm run build
npm run check
npm run dev
```

The development subreddit configured in `devvit.json` is `urubu_vegas_dev`.

## Playtest

```bash
npm run dev
```

Then create or open the Devvit playtest post in the configured development subreddit. The inline preview should load quickly; use `ENTER URUBU VEGAS` to request Expanded Mode.

## Local Mock Preview

After `npm run build`, this mock server serves `dist/client` and in-memory API responses:

```bash
node tools/local-preview-server.mjs --port=5176
```

Open `http://127.0.0.1:5176/game.html`. This is only a local browser preview; it does not validate Devvit Reddit runtime, auth or Redis.

## Tests

Unit tests cover deterministic RNG injection, valid grid generation, paytable behavior, WILD, SCATTER, reward calculation, non-negative balance, invalid bet/actionId rejection, idempotent replay, stats updates, win categories, slot simulations, crash ranges/cashout behavior and roulette zero/selection behavior.

## V0.1 Limits

- Symbol assets are lightweight SVGs; mascot PNGs are generated art assets under `public/assets/mascots`.
- No free-spins feature beyond SCATTER payout presentation.
- Logged-out users receive a clear login-required API response for persistent play.
- Reddit Playtest runtime still needs manual verification after local gates pass.
