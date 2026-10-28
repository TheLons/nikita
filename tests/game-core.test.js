import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame, STRIKE_TIMING } from '../game-core.js';

const random = () => 0.5;
const idle = { dx: 0, dy: 0, fire: false, ultimate: false };

test('fight starts with three hearts, a long boss bar and no charge', () => {
  const game = createGame(random);
  assert.equal(game.status, 'playing');
  assert.equal(game.player.hp, 3);
  assert.equal(game.player.charge, 0);
  assert.ok(game.boss.hp >= 30);
  assert.equal(game.phase, 1);
});

test('player movement stays inside the arena', () => {
  const game = createGame(random);
  for (let i = 0; i < 300; i++) stepGame(game, 1 / 60, { ...idle, dx: -1, dy: 1 }, random);
  assert.ok(game.player.x >= 22);
  assert.ok(game.player.y <= 455);
});

test('collecting extra notes never charges more than one ultimate', () => {
  const game = createGame(random);
  game.notes = [0, 1, 2, 3].map(() => ({ x: game.player.x, y: game.player.y, ttl: 2 }));
  stepGame(game, 1 / 60, idle, random);
  assert.equal(game.player.charge, 3);
});

test('a hit removes one heart and grants brief invulnerability', () => {
  const game = createGame(random);
  game.enemyStrikes = [{ x: game.player.x, y: game.player.y,
    age: STRIKE_TIMING.warning + STRIKE_TIMING.fall - .01, hit: false }];
  stepGame(game, 1 / 60, idle, random);
  assert.equal(game.player.hp, 2);
  assert.ok(game.player.invulnerable > 0);
  stepGame(game, 1 / 60, idle, random);
  assert.equal(game.player.hp, 2);
});

test('final shot wins and a final enemy projectile loses', () => {
  const win = createGame(random);
  win.boss.hp = 1;
  win.enemyTimer = 999;
  win.noteTimer = 999;
  stepGame(win, 1 / 60, { ...idle, fire: true }, random);
  for (let i = 0; i < 40; i++) stepGame(win, 1 / 60, idle, random);
  assert.equal(win.status, 'won');

  const loss = createGame(random);
  loss.player.hp = 1;
  loss.enemyStrikes = [{ x: loss.player.x, y: loss.player.y,
    age: STRIKE_TIMING.warning + STRIKE_TIMING.fall - .01, hit: false }];
  stepGame(loss, 1 / 60, idle, random);
  assert.equal(loss.status, 'lost');
});

test('elapsed time advances consistently at 30 and 60 frames per second', () => {
  const a = createGame(random);
  const b = createGame(random);
  for (let i = 0; i < 60; i++) stepGame(a, 1 / 60, idle, random);
  for (let i = 0; i < 30; i++) stepGame(b, 1 / 30, idle, random);
  assert.ok(Math.abs(a.time - 1) < 0.001);
  assert.ok(Math.abs(b.time - 1) < 0.001);
});
