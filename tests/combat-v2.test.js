import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame, STRIKE_TIMING } from '../game-core.js';
import { walkBounds } from '../arena-stage.js';

const random = () => 0.5;
const idle = { dx: 0, dy: 0, fire: false, ultimate: false };
const advance = (game, frames, input = idle) => {
  for (let i = 0; i < frames && game.status === 'playing'; i++) stepGame(game, 1 / 60, input, random);
};

test('boss starts with many hit points and a basic shot flies upward before dealing one damage', () => {
  const game = createGame();
  game.noteTimer = 999;
  game.enemyTimer = 999;
  assert.ok(game.boss.hp >= 30);
  stepGame(game, 1 / 60, { ...idle, fire: true }, random);
  assert.equal(game.playerShots.length, 1);
  assert.ok(game.player.fireFlash > 0);
  assert.equal(game.boss.hp, game.boss.maxHp);
  advance(game, 40);
  assert.equal(game.boss.hp, game.boss.maxHp - 1);
});

test('holding fire respects cooldown instead of spawning a shot every frame', () => {
  const game = createGame();
  game.noteTimer = 999;
  game.enemyTimer = 999;
  advance(game, 20, { ...idle, fire: true });
  assert.equal(game.playerShots.length, 1);
  advance(game, 20, { ...idle, fire: true });
  assert.equal(game.boss.maxHp - game.boss.hp + game.playerShots.length, 2);
});

test('three notes charge a distinct ultimate projectile that deals more damage', () => {
  const game = createGame();
  game.noteTimer = 999;
  game.enemyTimer = 999;
  stepGame(game, 1 / 60, { ...idle, ultimate: true }, random);
  assert.equal(game.playerShots.length, 0);
  game.notes = [0, 1, 2].map(() => ({ x: game.player.x, y: game.player.y, ttl: 2 }));
  stepGame(game, 1 / 60, idle, random);
  assert.equal(game.player.charge, 3);
  stepGame(game, 1 / 60, { ...idle, ultimate: true }, random);
  assert.equal(game.player.charge, 0);
  assert.equal(game.playerShots[0].type, 'ultimate');
  assert.ok(game.player.ultimateFlash > 0);
  advance(game, 40);
  assert.equal(game.boss.hp, game.boss.maxHp - 6);
});

test('boss marks the floor well before a projectile drops from above', () => {
  const game = createGame();
  game.noteTimer = 999;
  const randomValues = [0.05, 0.83, 0.37, 0.7, 0.18, 0.94];
  let index = 0;
  const varied = () => randomValues[index++ % randomValues.length];
  for (let i = 0; i < 50; i++) stepGame(game, 1 / 60, idle, varied);
  assert.ok(game.boss.windup > 0);
  for (let i = 0; i < 35; i++) stepGame(game, 1 / 60, idle, varied);
  assert.equal(game.enemyStrikes.length, 1);
  assert.ok(game.enemyStrikes.every(strike => strike.age < STRIKE_TIMING.warning));
  assert.ok(game.enemyStrikes.every(strike => {
    const bounds = walkBounds(strike.y);
    return strike.x >= bounds.left + 16 && strike.x <= bounds.right - 16;
  }));
  assert.ok(game.boss.cast > 0);
});

test('later phases keep simultaneous target marks apart', () => {
  const game = createGame();
  game.phase = 2;
  game.noteTimer = 999;
  advance(game, 85);
  assert.equal(game.enemyStrikes.length, 2);
  const [a, b] = game.enemyStrikes;
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 58);
});

test('the floor mark cannot hurt until the falling projectile lands', () => {
  const game = createGame();
  game.enemyTimer = 999;
  game.noteTimer = 999;
  game.enemyStrikes = [{ x: game.player.x, y: game.player.y, age: 0, hit: false }];
  const lead = STRIKE_TIMING.warning + STRIKE_TIMING.fall;
  advance(game, Math.floor((lead - .08) * 60));
  assert.equal(game.player.hp, 3);
  assert.equal(game.enemyStrikes.length, 1);
  advance(game, 12);
  assert.equal(game.player.hp, 2);
});

test('the fading impact is safe after the landing frame', () => {
  const game = createGame();
  game.enemyTimer = 999;
  game.noteTimer = 999;
  game.enemyStrikes = [{ x: game.player.x, y: game.player.y,
    age: STRIKE_TIMING.warning + STRIKE_TIMING.fall + .03, hit: false }];
  stepGame(game, 1 / 60, idle, random);
  assert.equal(game.player.hp, 3);
});

test('a hero standing outside the visible floor mark is safe', () => {
  const game = createGame();
  game.enemyTimer = 999;
  game.noteTimer = 999;
  game.enemyStrikes = [{ x: game.player.x, y: game.player.y - 20,
    age: STRIKE_TIMING.warning + STRIKE_TIMING.fall - .01, hit: false }];
  stepGame(game, 1 / 60, idle, random);
  assert.equal(game.player.hp, 3);
});

test('movement and firing expose separate animation timers', () => {
  const game = createGame();
  stepGame(game, 1 / 60, { ...idle, dx: 1, fire: true }, random);
  assert.equal(game.player.moving, true);
  assert.ok(game.player.walkTime > 0);
  assert.ok(game.player.fireFlash > 0);
  stepGame(game, 1 / 60, idle, random);
  assert.equal(game.player.moving, false);
});

test('boss phase changes as projectiles reduce health', () => {
  const game = createGame();
  game.noteTimer = 999;
  game.enemyTimer = 999;
  game.boss.hp = 28;
  game.player.charge = 3;
  stepGame(game, 1 / 60, { ...idle, ultimate: true }, random);
  advance(game, 40);
  assert.equal(game.phase, 2);
  game.boss.hp = 16;
  game.player.charge = 3;
  stepGame(game, 1 / 60, { ...idle, ultimate: true }, random);
  advance(game, 40);
  assert.equal(game.phase, 3);
});
