import { PLAYFIELD, walkBounds } from './arena-stage.js';

export const ARENA = { width: 360, height: 480 };

const BOSS_HEALTH = 40;
const BASIC_COOLDOWN = 0.55;
export const STRIKE_TIMING = Object.freeze({
  warning: 1.15, fall: 0.58, impact: 0.2, hitX: 25, hitY: 15,
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distanceSq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export function createGame(difficulty = 'easy') {
  return {
    status: 'playing',
    difficulty: difficulty === 'hard' ? 'hard' : 'easy',
    time: 0,
    phase: 1,
    player: {
      x: 180, y: 410, hp: 3, charge: 0, invulnerable: 0,
      basicCooldown: 0, fireFlash: 0, ultimateFlash: 0,
      walkTime: 0, moving: false, facing: 1,
    },
    boss: { hp: BOSS_HEALTH, maxHp: BOSS_HEALTH, flash: 0, cast: 0, windup: 0 },
    notes: [],
    playerShots: [],
    enemyStrikes: [],
    events: [],
    noteTimer: 0.9,
    enemyTimer: 1.25,
    wave: 0,
  };
}

function updatePhase(game) {
  const next = game.boss.hp <= 14 ? 3 : game.boss.hp <= 27 ? 2 : 1;
  if (next !== game.phase) {
    game.phase = next;
    game.events.push('phase');
  }
}

function spawnEnemyWave(game, random) {
  const count = game.difficulty === 'hard' ? Math.min(4, game.phase + 1) : Math.min(2, game.phase);
  const chosen = [];
  const anchors = [
    [120, 335], [240, 410], [240, 335], [120, 410], [180, 376],
  ];
  const hardOffset = game.difficulty === 'hard'
    ? (game.wave + Math.floor(random() * anchors.length)) % anchors.length : 0;
  for (let i = 0; i < count; i++) {
    let target;
    if (game.difficulty === 'hard') {
      const [anchorX, anchorY] = anchors[(hardOffset + i) % anchors.length];
      const y = anchorY + (random() - .5) * 8;
      const bounds = walkBounds(y);
      target = { x: clamp(anchorX + (random() - .5) * 8, bounds.left + 18, bounds.right - 18), y };
    } else {
      for (let attempt = 0; attempt < 14; attempt++) {
        const y = PLAYFIELD.top + 28 + random() * (PLAYFIELD.bottom - PLAYFIELD.top - 53);
        const bounds = walkBounds(y);
        const x = bounds.left + 24 + random() * (bounds.right - bounds.left - 48);
        if (chosen.every(other => distanceSq(other, { x, y }) >= 58 ** 2)) {
          target = { x, y };
          break;
        }
      }
      if (!target) {
        for (let offset = 0; offset < anchors.length; offset++) {
          const [x, y] = anchors[(game.wave + i * 2 + offset) % anchors.length];
          if (chosen.every(other => distanceSq(other, { x, y }) >= 58 ** 2)) {
            target = { x, y };
            break;
          }
        }
      }
    }
    if (target) {
      chosen.push(target);
      game.enemyStrikes.push({ ...target, age: 0, hit: false });
    }
  }
  game.wave += 1;
  game.boss.windup = 0;
  game.boss.cast = 0.42;
  game.events.push('enemy-fire');
}

export function stepGame(game, seconds, input = {}, random = Math.random) {
  game.events = [];
  if (game.status !== 'playing') return game;
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05);
  game.time += dt;
  const player = game.player;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.basicCooldown = Math.max(0, player.basicCooldown - dt);
  player.fireFlash = Math.max(0, player.fireFlash - dt);
  player.ultimateFlash = Math.max(0, player.ultimateFlash - dt);
  game.boss.flash = Math.max(0, game.boss.flash - dt);
  game.boss.cast = Math.max(0, game.boss.cast - dt);

  const dx = clamp(Number(input.dx) || 0, -1, 1);
  const dy = clamp(Number(input.dy) || 0, -1, 1);
  const magnitude = Math.hypot(dx, dy) || 1;
  const previousX = player.x;
  const previousY = player.y;
  if (dx !== 0) player.facing = Math.sign(dx);
  player.y = clamp(player.y + (dy / magnitude) * 178 * dt, PLAYFIELD.top, PLAYFIELD.bottom);
  const bounds = walkBounds(player.y);
  player.x = clamp(player.x + (dx / magnitude) * 178 * dt, bounds.left, bounds.right);
  player.moving = Math.abs(player.x - previousX) > .001 || Math.abs(player.y - previousY) > .001;
  if (player.moving) player.walkTime += dt * 10;

  game.notes = game.notes.filter((note) => {
    note.ttl -= dt;
    if (note.ttl <= 0) return false;
    if (distanceSq(note, player) < 22 ** 2) {
      player.charge = Math.min(3, player.charge + 1);
      game.events.push('note');
      return false;
    }
    return true;
  });

  if (input.fire && player.basicCooldown <= 0) {
    game.playerShots.push({
      x: player.x + 4 * player.facing, y: player.y - 77,
      vx: 0, vy: -355, radius: 5, damage: 1, type: 'basic',
    });
    player.basicCooldown = BASIC_COOLDOWN;
    player.fireFlash = 0.30;
    game.events.push('basic-fire');
  }
  if (input.ultimate && player.charge >= 3) {
    game.playerShots.push({
      x: player.x + 4 * player.facing, y: player.y - 80,
      vx: (180 - player.x) * 2, vy: -330,
      radius: 22, damage: 6, type: 'ultimate',
    });
    player.charge = 0;
    player.ultimateFlash = 0.72;
    game.events.push('ultimate-fire');
  }

  game.playerShots = game.playerShots.filter((shot) => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.y <= 174) {
      if (shot.type === 'ultimate' || Math.abs(shot.x - 180) < 86) {
        game.boss.hp = Math.max(0, game.boss.hp - shot.damage);
        game.boss.flash = shot.type === 'ultimate' ? 0.38 : 0.13;
        game.events.push(shot.type === 'ultimate' ? 'ultimate-hit' : 'boss-hit');
        updatePhase(game);
        if (game.boss.hp === 0) {
          game.status = 'won';
          game.events.push('won');
        }
      } else {
        game.events.push('miss');
      }
      return false;
    }
    return shot.y > -30;
  });
  if (game.status === 'won') return game;

  const impactAt = STRIKE_TIMING.warning + STRIKE_TIMING.fall;
  const endAt = impactAt + STRIKE_TIMING.impact;
  game.enemyStrikes = game.enemyStrikes.filter((strike) => {
    const previousAge = strike.age;
    strike.age += dt;
    const landed = previousAge < impactAt && strike.age >= impactAt;
    if (landed && !game.events.includes('enemy-impact')) game.events.push('enemy-impact');
    const dxFromTarget = (player.x - strike.x) / STRIKE_TIMING.hitX;
    const dyFromTarget = (player.y - strike.y) / STRIKE_TIMING.hitY;
    if (landed && !strike.hit && player.invulnerable <= 0 &&
      dxFromTarget ** 2 + dyFromTarget ** 2 < 1) {
      player.hp -= 1;
      player.invulnerable = 1.28;
      strike.hit = true;
      game.events.push('hurt');
      if (player.hp <= 0) {
        game.status = 'lost';
        game.events.push('lost');
      }
    }
    return strike.age < endAt;
  });
  if (game.status === 'lost') return game;

  game.noteTimer -= dt;
  if (game.noteTimer <= 0) {
    const y = PLAYFIELD.top + 15 + random() * (PLAYFIELD.bottom - PLAYFIELD.top - 30);
    const bounds = walkBounds(y);
    game.notes.push({ x: bounds.left + 16 + random() * (bounds.right - bounds.left - 32), y, ttl: 9 });
    game.noteTimer += 3;
    game.events.push('spawn-note');
  }

  game.enemyTimer -= dt;
  if (game.enemyTimer <= 0) {
    spawnEnemyWave(game, random);
    game.enemyTimer += game.difficulty === 'hard'
      ? 2.3 - game.phase * .1 : 2.8 - game.phase * .15;
  } else {
    game.boss.windup = clamp((0.52 - game.enemyTimer) / 0.52, 0, 1);
  }
  return game;
}
