You are working on `urubu-vegas`, a Devvit Web game that runs inside Reddit Custom Posts.

## Stack

- Frontend: Phaser `4.2.1`, Vite `8.1.5`, TypeScript `6.0.3`
- Backend: Devvit Web `0.14.0`, Hono, Node serverless runtime
- Persistence: Devvit Redis
- Reddit APIs: `@devvit/web/server`

## Entry Points

- `src/client/splash.html`: lightweight inline preview.
- `src/client/game.html`: Expanded Mode Phaser app.
- `devvit.json` maps `default` to `splash.html` and `game` to `game.html`.
- Expanded Mode must be requested from a trusted click with `requestExpandedMode(event, 'game')`.

## Client Structure

- `src/client/scenes/CasinoLobby.ts`: game hub and player/global summary.
- `src/client/scenes/UrubuzinhoGame.ts`: 5x3 slot presentation and animation.
- `src/client/scenes/ProfileScene.ts`: player stats.
- `src/client/scenes/LeaderboardScene.ts`: Richest, Biggest Win, Most Plays.
- `src/client/scenes/HelpScene.ts`: rules and disclaimer.
- `src/client/audio`, `effects`, `haptics`, `feedback`: adapted reusable engines from `game-lab`.
- `src/client/api`: typed fetch wrappers.
- `src/client/state`: in-memory client state hydrated by server responses.

## Server Structure

- `src/server/routes/api.ts`: public API endpoints.
- `src/server/core/post.ts`: Custom Post creation.
- `src/server/urubuVegas/redisKeys.ts`: versioned key schema.
- `src/server/urubuVegas/playerStore.ts`: Redis serialization and leaderboard reads.
- `src/server/urubuVegas/roundService.ts`: pure round processing used by endpoint and tests.

## Shared Domain

- `src/shared/urubuVegas.ts`: contracts, validators, player state helpers.
- `src/shared/games/urubuzinho/SlotEngine.ts`: pure slot engine.
- `symbols.ts`, `paytable.ts`, `config.ts`: centralized game math and symbols.

## Server Authority Rules

- The client never sends or decides balance, reward, grid, rank, multiplier or stats.
- Bets must be one of the configured fixed values.
- `actionId` must pass validation and is stored in an idempotency key.
- Replaying the same `actionId` returns the stored result and does not debit or credit again.
- Rounds use server-side `crypto.randomInt`.
- Redis updates for a round use `watch`, `multi`, and `exec` around player, idempotency and global keys.

## Redis Keys

- `uv:v1:player:{userId}`
- `uv:v1:idem:{userId}:{actionId}`
- `uv:v1:global`
- `uv:v1:lb:richest`
- `uv:v1:lb:biggestWin`
- `uv:v1:lb:mostPlays`

Do not use global `KEYS` scans for normal gameplay.

## Game Plugin Pattern

Lobby game cards use a simple `GameDefinition` shape with `id`, `title`, `subtitle`, `status`, and optional scene key. Add future minigames by adding a new scene and one lobby definition. Do not build a framework until more than one playable game needs it.

## UX Rules

- Mobile-first.
- Keep inline mode light; do not initialize Phaser in `splash.html`.
- Always show: `Virtual credits only. No purchases, prizes or withdrawals.`
- Avoid real-money terminology beyond explicit disclaimers.
- Sound must unlock only after interaction and suspend on `visibilitychange`.
- Haptics must be optional no-op when unsupported.

## Quality Gates

Run before handoff:

```bash
npm run test:types
npm run lint
npm run test:unit
npm run build
npm run check
```

Manual Reddit Playtest remains separate from local build/test validation.

## Boundaries

Do not add payments, Reddit Gold purchases, crypto, account linking, external backend, marketplace, player transfers, withdrawable rewards, ads, or monetization without explicit instructions.
