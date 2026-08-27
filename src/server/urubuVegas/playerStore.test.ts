import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { deserializePlayer, serializePlayer } from './playerStore.ts';
// @ts-expect-error -- Node strip-types resolves explicit TypeScript test imports.
import { createDefaultPlayer } from '../../shared/api.ts';

void test('serialized empty Jacare round id is restored as null', () => {
  const now = 1_800_000_000_000;
  const serialized = serializePlayer(
    createDefaultPlayer('user-1', 'tester', now)
  );
  const player = deserializePlayer(serialized, 'user-1', 'tester', now + 1);

  assert.equal(serialized.activeJacareRoundId, '');
  assert.equal(player.activeJacareRoundId, null);
});
