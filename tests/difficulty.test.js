import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame } from '../game-core.js';
import { walkBounds } from '../arena-stage.js';

function firstWave(difficulty, phase = 1) {
  const game = createGame(difficulty);
  game.phase = phase;
  game.noteTimer = 999;
  for (let frame = 0; frame < 85; frame++) stepGame(game, 1 / 60, {}, () => .5);
  return game;
}

test('ordinary mode keeps the current one-to-two target pattern', () => {
  assert.equal(createGame().difficulty, 'easy');
  assert.equal(firstWave('easy', 1).enemyStrikes.length, 1);
  assert.equal(firstWave('easy', 3).enemyStrikes.length, 2);
});

test('challenge mode marks two to four separated floor targets', () => {
  assert.equal(createGame('hard').difficulty, 'hard');
  for (const [phase, count] of [[1, 2], [2, 3], [3, 4]]) {
    const game = firstWave('hard', phase);
    assert.equal(game.enemyStrikes.length, count);
    for (const target of game.enemyStrikes) {
      const bounds = walkBounds(target.y);
      assert.ok(target.x >= bounds.left + 16 && target.x <= bounds.right - 16);
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = game.enemyStrikes[i];
        const b = game.enemyStrikes[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 58);
      }
    }
  }
});

test('challenge mode also leaves less time between volleys', () => {
  const easy = firstWave('easy');
  const hard = firstWave('hard');
  assert.ok(hard.enemyTimer < easy.enemyTimer);
});
