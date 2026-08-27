# Urubu Vegas Manual Checklist

## Automated

- [ ] `npm install`
- [ ] `npm run test:types`
- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] `npm run check`

## Inline / Expanded

- [ ] Inline preview opens quickly.
- [ ] `ENTER URUBU VEGAS` opens Expanded Mode from a trusted click.
- [ ] No Phaser bundle is loaded by inline preview.
- [ ] Disclaimer is visible.

## Desktop

- [ ] Lobby appears.
- [ ] Urubuzinho opens.
- [ ] Oncinha 777 opens.
- [ ] Jacare Crash opens.
- [ ] Capivara Roulette opens.
- [ ] 5x3 reels are visible.
- [ ] Slot symbols render as assets, not text placeholders.
- [ ] Bet minus/plus works.
- [ ] PLAY starts reel animation before server response completes.
- [ ] Reels stop on server result.
- [ ] Winning cells highlight.
- [ ] Profile opens and returns.
- [ ] Profile shows per-game stats.
- [ ] Leaderboards open and return.
- [ ] Help opens and returns.
- [ ] Sound mute toggles.

## Mobile Portrait

- [ ] Lobby fits without important overlap.
- [ ] PLAY is reachable by thumb.
- [ ] Reels and balance are readable.
- [ ] Touch targets are comfortable.
- [ ] Safe areas do not hide controls.

## Mobile Landscape

- [ ] Lobby remains usable.
- [ ] Reels remain visible.
- [ ] Controls remain clickable.
- [ ] Rotate does not duplicate listeners.
- [ ] Rotate during an idle slot screen does not reset player state.

## Round Correctness

- [ ] New player receives 10,000 virtual credits.
- [ ] Balance persists after reload.
- [ ] Server rejects invalid bet values.
- [ ] Server rejects invalid actionId.
- [ ] Server rejects invalid roulette selection.
- [ ] Double tap does not create two local plays.
- [ ] Repeating same actionId does not debit or credit twice.
- [ ] Balance never goes negative.
- [ ] WILD substitutes normal symbols.
- [ ] WILD does not substitute SCATTER.
- [ ] 3+ SCATTER triggers bonus reward.
- [ ] WIN / BIG WIN / MEGA WIN effects appear.
- [ ] Jacare start debits once.
- [ ] Jacare cashout clears active round.
- [ ] Duplicate Jacare cashout does not credit twice.
- [ ] Roulette zero loses red/black/odd/even/low/high and wins only zero single.

## Redis Persistence

- [ ] Player hash updates.
- [ ] Idempotency key is written with TTL.
- [ ] `uv:v1:lb:richest` orders by balance.
- [ ] `uv:v1:lb:biggestWin` orders by biggest single win.
- [ ] `uv:v1:lb:mostPlays` orders by total rounds.
- [ ] `uv:v1:global` increments community plays.
- [ ] `uv:v1:crash:{userId}:{roundId}` is written with short TTL.
- [ ] Existing user reload keeps stats.
- [ ] New user starts with initial balance.

## Failure Modes

- [ ] API failure shows `Connection hiccup. Try again.`
- [ ] Failed request re-enables PLAY.
- [ ] No fake local balance update happens after failure.
- [ ] Background/foreground does not leave audio running.
- [ ] Unsupported haptics never crashes.
- [ ] 20+ rounds in one session do not show obvious degradation.

## Reddit Playtest

- [ ] `npm run dev` starts Devvit playtest.
- [ ] Post can be created in `urubu_vegas_dev`.
- [ ] Inline mode works in Reddit web.
- [ ] Expanded mode works in Reddit web.
- [ ] Android Reddit app portrait pass.
- [ ] Android Reddit app landscape pass.
- [ ] iOS Reddit app portrait pass.
- [ ] iOS Reddit app landscape pass.
