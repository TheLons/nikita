import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame } from '../game-core.js';
import { PLAYFIELD, walkBounds } from '../arena-stage.js';

const random = () => .5;

test('the hero stays on the marked combat floor rather than the scenery', () => {
  const game = createGame();
  game.enemyTimer = 999;
  game.noteTimer = 999;
  for (let i = 0; i < 240; i++) stepGame(game, 1 / 60, { dx: -1, dy: 1 }, random);
  const bottom = walkBounds(game.player.y);
  assert.equal(game.player.y, PLAYFIELD.bottom);
  assert.equal(game.player.x, bottom.left);
  const stoppedAtEdge = game.player.walkTime;
  stepGame(game, 1 / 60, { dx: -1, dy: 1 }, random);
  assert.equal(game.player.moving, false);
  assert.equal(game.player.walkTime, stoppedAtEdge);
  for (let i = 0; i < 240; i++) stepGame(game, 1 / 60, { dx: -1, dy: -1 }, random);
  const top = walkBounds(game.player.y);
  assert.equal(game.player.y, PLAYFIELD.top);
  assert.equal(game.player.x, top.left);
});

test('new notes appear inside the combat floor', () => {
  const game = createGame();
  game.enemyTimer = 999;
  game.noteTimer = .001;
  stepGame(game, 1 / 60, {}, random);
  assert.equal(game.notes.length, 1);
  const note = game.notes[0];
  const bounds = walkBounds(note.y);
  assert.ok(note.y >= PLAYFIELD.top && note.y <= PLAYFIELD.bottom);
  assert.ok(note.x >= bounds.left + 12 && note.x <= bounds.right - 12);
});
