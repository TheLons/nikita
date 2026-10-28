import { createGame, stepGame, ARENA, STRIKE_TIMING } from './game-core.js';
import { createControls } from './controls.js';
import { drawHero } from './hero.js';
import { drawArenaStage } from './arena-stage.js';
import { createLifecycle } from './lifecycle.js';

const canvas = document.querySelector('#arena');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const arenaArtwork = new Image();
arenaArtwork.src = new URL('./assets/arena-pixel.png', import.meta.url).href;
const bossArtwork = new Image();
bossArtwork.src = new URL('./assets/deadline.png', import.meta.url).href;
const bossSprites = new Image();
bossSprites.src = new URL('./assets/deadline-sprites.png', import.meta.url).href;
const victoryArtwork = new Image();
victoryArtwork.src = new URL('./assets/victory.png', import.meta.url).href;
const overlay = document.querySelector('#overlay');
const page = document.querySelector('.page');
const overlayKicker = document.querySelector('#overlay-kicker');
const overlayTitle = document.querySelector('#overlay-title');
const overlayCopy = document.querySelector('#overlay-copy');
const primary = document.querySelector('#primary');
const difficultyButtons = [...document.querySelectorAll('[data-difficulty]')];
const soundButton = document.querySelector('#sound');
const fireButton = document.querySelector('#fire');
const ultimateButton = document.querySelector('#ultimate');
const hearts = document.querySelector('#hearts');
const bossBar = document.querySelector('#boss-bar');
const phaseText = document.querySelector('#phase');
const chargeText = document.querySelector('#charge');
const announcer = document.querySelector('#announcer');

const controls = createControls();
const lifecycle = createLifecycle();
lifecycle.setFocused(document.hasFocus());
lifecycle.setVisible(!document.hidden);
let game = createGame();
let running = false;
let scene = 'intro';
let sceneTime = 0;
let selectedDifficulty = 'easy';
let lastFrame = performance.now();
let soundOn = true;
let audioContext;
let melodyTimer = 0;
let melodyStep = 0;

function tone(frequency, duration = 0.12, volume = 0.035, type = 'triangle', delay = 0) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function soundEvents() {
  for (const event of game.events) {
    if (event === 'note') {
      tone([523, 659, 784][Math.max(0, game.player.charge - 1)], 0.17, 0.04);
      if (game.player.charge === 3) announcer.textContent = 'Финальный аккорд готов!';
    } else if (event === 'enemy-fire') tone(164, 0.12, 0.018, 'square');
    else if (event === 'enemy-impact') tone(104, 0.22, 0.025, 'sawtooth');
    else if (event === 'hurt') tone(120, 0.32, 0.055, 'sawtooth');
    else if (event === 'basic-fire') tone(660, 0.08, 0.025, 'square');
    else if (event === 'boss-hit') tone(330, 0.07, 0.018, 'triangle');
    else if (event === 'phase') announcer.textContent = `Дедлайн: фаза ${game.phase}!`;
    else if (event === 'ultimate-fire') {
      [392, 494, 587, 784].forEach((pitch, index) => tone(pitch, 0.42, 0.05, 'triangle', index * 0.055));
      announcer.textContent = 'Финальный аккорд!';
    } else if (event === 'ultimate-hit') {
      tone(196, 0.35, 0.05, 'sawtooth');
      announcer.textContent = 'Дедлайн получил мощный удар!';
    }
  }
}

function playMelody(dt) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  melodyTimer -= dt;
  if (melodyTimer > 0) return;
  const melody = [220, 277.18, 329.63, 277.18, 246.94, 329.63, 369.99, 329.63];
  tone(melody[melodyStep % melody.length], 0.28, 0.012, 'triangle');
  melodyStep++;
  melodyTimer += 0.38;
}

function updateHud() {
  hearts.textContent = `${'♥ '.repeat(game.player.hp)}${'♡ '.repeat(3 - game.player.hp)}`.trim();
  bossBar.style.width = `${game.boss.hp / game.boss.maxHp * 100}%`;
  phaseText.textContent = `ФАЗА ${game.phase} / 3`;
  chargeText.textContent = `${'● '.repeat(game.player.charge)}${'○ '.repeat(3 - game.player.charge)}`.trim();
  ultimateButton.classList.toggle('ready', game.player.charge >= 3 && game.status === 'playing');
  ultimateButton.setAttribute('aria-disabled', String(game.player.charge < 3));
}

function showEnd(status) {
  running = false;
  scene = status === 'won' ? 'victory' : 'loss';
  page.classList.remove('is-ending');
  overlay.hidden = false;
  overlay.classList.remove('intro');
  overlay.classList.toggle('win', status === 'won');
  if (status === 'won') {
    overlayKicker.textContent = game.difficulty === 'hard'
      ? 'ИСПЫТАНИЕ ПРОЙДЕНО · LEVEL 31' : 'КВЕСТ ВЫПОЛНЕН · LEVEL 31';
    overlayTitle.textContent = 'С 31-летием, Никита!';
    overlayCopy.textContent = 'Итак, Никита разобрался с Дедлайном. А мы хотим пожелать тебе, чтобы вдохновение приходило вовремя, идеи звучали громче тревог, а рядом всегда были люди, с которыми приятно разделить победу. Новых треков, радости и времени на себя. С 31-летием!';
    primary.innerHTML = 'СЫГРАТЬ ЕЩЁ <span>↻</span>';
    announcer.textContent = 'Победа! С 31-летием, Никита!';
    [523, 659, 784, 1046].forEach((pitch, i) => tone(pitch, 0.4, 0.045, 'triangle', i * 0.13));
  } else {
    overlayKicker.textContent = game.difficulty === 'hard'
      ? 'ИСПЫТАНИЕ · ДЕДЛАЙН ПОБЕДИЛ' : 'ДЕДЛАЙН ПОБЕДИЛ · ПОКА ЧТО';
    overlayTitle.textContent = 'Ещё один дубль?';
    overlayCopy.textContent = 'Даже лучший трек редко выходит с первого тейка. Собери ноты и попробуй снова!';
    primary.innerHTML = 'ПОВТОРИТЬ БОЙ <span>↻</span>';
    announcer.textContent = 'Попробуй ещё раз.';
  }
}

function updateSoundButton() {
  soundButton.setAttribute('aria-pressed', String(!soundOn));
  soundButton.setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук');
  soundButton.querySelector('span').textContent = soundOn ? 'ЗВУК ВКЛ' : 'ЗВУК ВЫКЛ';
}

async function syncAudio() {
  if (!audioContext) return;
  try {
    if (lifecycle.audioShouldRun(running, soundOn) && audioContext.state === 'suspended') {
      await audioContext.resume();
    } else if (!lifecycle.audioShouldRun(running, soundOn) && audioContext.state === 'running') {
      await audioContext.suspend();
    }
  } catch {
    soundOn = false;
    updateSoundButton();
  }
}

async function startGame() {
  if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  game = createGame(selectedDifficulty);
  controls.clear();
  scene = 'playing';
  sceneTime = 0;
  page.classList.remove('is-intro', 'is-ending');
  melodyTimer = 0;
  melodyStep = 0;
  overlay.hidden = true;
  overlay.classList.remove('intro', 'win');
  running = true;
  await syncAudio();
  lastFrame = performance.now();
  updateHud();
  announcer.textContent = `Сложность: ${selectedDifficulty === 'hard' ? 'сложно' : 'легко'}. Бой начался.`;
}

primary.addEventListener('click', startGame);
for (const button of difficultyButtons) {
  button.addEventListener('click', () => {
    selectedDifficulty = button.dataset.difficulty;
    for (const option of difficultyButtons) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    page.classList.toggle('is-hard', selectedDifficulty === 'hard');
    announcer.textContent = selectedDifficulty === 'hard'
      ? 'Сложность: сложно. Одновременно падают от двух до четырёх снарядов.'
      : 'Сложность: легко. Одновременно падают один или два снаряда.';
  });
}
soundButton.addEventListener('click', async () => {
  soundOn = !soundOn;
  updateSoundButton();
  await syncAudio();
});

for (const button of document.querySelectorAll('[data-direction]')) {
  const direction = button.dataset.direction;
  const release = (event) => {
    controls.release(direction, `pointer:${event.pointerId}`);
    button.classList.remove('is-held');
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    controls.press(direction, `pointer:${event.pointerId}`);
    button.classList.add('is-held');
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
fireButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  fireButton.setPointerCapture(event.pointerId);
  controls.pressFire(`pointer:${event.pointerId}`);
  fireButton.classList.add('is-held');
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  fireButton.addEventListener(type, (event) => {
    controls.releaseFire(`pointer:${event.pointerId}`);
    fireButton.classList.remove('is-held');
  });
}
ultimateButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  controls.queueUltimate();
});

const keyDirections = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
window.addEventListener('keydown', (event) => {
  if (keyDirections[event.code]) {
    event.preventDefault();
    controls.press(keyDirections[event.code], `key:${event.code}`);
  } else if (event.code === 'Space' || event.code === 'KeyJ') {
    event.preventDefault();
    controls.pressFire(`key:${event.code}`);
  } else if (event.code === 'KeyE' || event.code === 'KeyK') {
    event.preventDefault();
    if (!event.repeat) controls.queueUltimate();
  }
});
window.addEventListener('keyup', (event) => {
  if (keyDirections[event.code]) controls.release(keyDirections[event.code], `key:${event.code}`);
  else if (event.code === 'Space' || event.code === 'KeyJ') controls.releaseFire(`key:${event.code}`);
});
window.addEventListener('blur', () => {
  lifecycle.setFocused(false);
  controls.clear();
  syncAudio();
});
window.addEventListener('focus', () => {
  lifecycle.setFocused(true);
  lastFrame = performance.now();
  syncAudio();
});
document.addEventListener('visibilitychange', () => {
  lifecycle.setVisible(!document.hidden);
  controls.clear();
  lastFrame = performance.now();
  syncAudio();
});

function pixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function background(t) {
  if (arenaArtwork.complete && arenaArtwork.naturalWidth) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(arenaArtwork, 0, 0, ARENA.width, ARENA.height);
    ctx.restore();
    return;
  }
  pixelRect(0, 0, 360, 480, '#15152c');
  pixelRect(12, 0, 336, 216, '#23213b');
  pixelRect(26, 0, 308, 209, '#0d1730');
  pixelRect(33, 12, 294, 197, '#172542');
  pixelRect(43, 21, 274, 182, '#111d39');
  pixelRect(0, 0, 30, 272, '#332b42');
  pixelRect(330, 0, 30, 272, '#332b42');
  pixelRect(8, 0, 9, 270, '#76546a');
  pixelRect(343, 0, 9, 270, '#76546a');
  pixelRect(0, 211, 360, 9, '#64516a');
  pixelRect(0, 220, 360, 260, '#26233a');
  pixelRect(0, 224, 360, 4, '#92745f');
  pixelRect(0, 468, 360, 12, '#0d0e20');

  // Moonlit studio windows and skyline.
  pixelRect(222, 36, 42, 42, '#e2d2a0');
  pixelRect(228, 32, 34, 46, '#f3e4b0');
  pixelRect(238, 28, 22, 50, '#fff1c8');
  pixelRect(243, 38, 18, 36, '#e4dfb9');
  for (let i = 0; i < 17; i++) {
    const sx = 48 + (i * 67) % 260;
    const sy = 25 + (i * 39) % 110;
    pixelRect(sx, sy, i % 4 === 0 ? 3 : 2, 2, '#adbad1');
  }
  pixelRect(40, 153, 56, 57, '#10182c');
  pixelRect(87, 169, 29, 41, '#121b30');
  pixelRect(111, 138, 42, 72, '#111a2f');
  pixelRect(147, 159, 35, 51, '#10182c');
  pixelRect(242, 156, 70, 54, '#121b30');
  pixelRect(73, 130, 8, 80, '#17233b');
  pixelRect(128, 121, 7, 89, '#17233b');
  pixelRect(270, 136, 8, 74, '#17233b');
  pixelRect(169, 19, 7, 192, '#5a4a62');
  pixelRect(32, 119, 294, 6, '#5a4a62');

  // Floor grid, piano and shelves. It remains dark enough for hazards.
  for (let y = 250; y < 480; y += 36) pixelRect(0, y, 360, 2, '#3c344c');
  for (let x = 16; x < 360; x += 49) pixelRect(x, 228, 2, 252, '#332d45');
  pixelRect(0, 195, 66, 105, '#211a2e');
  pixelRect(4, 203, 58, 8, '#715569');
  pixelRect(7, 218, 52, 37, '#121225');
  for (let x = 12; x < 57; x += 6) pixelRect(x, 218, 4, 21, '#dfd0b2');
  pixelRect(3, 255, 8, 50, '#44354a');
  pixelRect(53, 255, 8, 50, '#44354a');
  pixelRect(310, 185, 50, 9, '#846054');
  pixelRect(317, 198, 35, 5, '#6a4a50');
  pixelRect(310, 207, 50, 9, '#846054');
  pixelRect(315, 185, 8, 23, '#ae7962');
  pixelRect(338, 188, 7, 19, '#b38667');
  const flicker = Math.floor(t * 8) % 2;
  pixelRect(18, 174, 3, 15, '#eac188');
  pixelRect(17, 168 - flicker, 5, 8, '#ffce68');
  pixelRect(335, 164, 3, 20, '#eac188');
  pixelRect(334, 157 + flicker, 5, 8, '#ffce68');
}

function boss(t, state) {
  const bob = Math.round(Math.sin(t * 2.5) * 4);
  const cast = state.cast > 0;
  const flash = state.flash > 0;
  const windup = state.windup || 0;
  if (bossSprites.complete && bossSprites.naturalWidth) {
    const pose = cast ? 2 : windup > .02 ? 1 : 0;
    const scale = 1 + windup * .065 - (cast ? .025 : 0);
    ctx.save();
    ctx.translate(180 + (cast ? Math.sin(t * 50) * 3 : 0), 8 + bob - windup * 6);
    ctx.scale(scale, scale);
    ctx.rotate(Math.sin(t * 1.8) * .012 + (cast ? .025 : 0));
    ctx.globalAlpha = flash && Math.floor(t * 20) % 2 ? .6 : 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bossSprites, pose * 136, 0, 136, 181, -94, 0, 188, 250);
    ctx.restore();
    if (windup > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,92,106,${.22 + windup * .55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(180, 85 + bob, 28 + windup * 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  if (bossArtwork.complete && bossArtwork.naturalWidth) {
    ctx.save();
    ctx.translate(180 + (cast ? Math.sin(t * 48) * 3 : 0), 112 + bob - windup * 5);
    ctx.rotate(Math.sin(t * 1.8) * .025 + (cast ? .07 : 0));
    const scale = 1 + windup * .07 - (cast ? .035 : 0);
    ctx.scale(scale, scale);
    if (flash && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.58;
    ctx.imageSmoothingEnabled = true;
    if (windup > 0) {
      ctx.filter = `brightness(${1 + windup * .5}) saturate(1.4)`;
      ctx.shadowColor = '#ff5366';
      ctx.shadowBlur = windup * 30;
    } else if (cast) ctx.filter = 'brightness(1.35) saturate(1.4)';
    ctx.drawImage(bossArtwork, -144, -95, 288, 192);
    ctx.restore();
    if (windup > 0) {
      const radius = 14 + windup * 25;
      ctx.save();
      ctx.strokeStyle = `rgba(255,92,106,${.25 + windup * .6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(180, 151 + bob - radius);
      ctx.lineTo(180 + radius, 151 + bob);
      ctx.lineTo(180, 151 + bob + radius);
      ctx.lineTo(180 - radius, 151 + bob);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    if (cast) {
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3 + t * 5;
        const radius = 27 + (1 - state.cast / .42) * 19;
        pixelRect(180 + Math.cos(angle) * radius, 150 + bob + Math.sin(angle) * radius, 5, 5, '#ff8c80');
      }
    }
    return;
  }
  ctx.save();
  ctx.translate(180, 100 + bob);
  ctx.scale(2, 2);
  if (flash && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.65;
  const p = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  p(-26,-12,52,49,'#130f20');
  p(-30,3,60,32,'#3a2837');
  p(-24,2,48,31,'#1e192a');
  p(-35,13,12,6,'#8b5559'); p(23,13,12,6,'#8b5559');
  p(-42,16,13,5,'#412637'); p(29,16,13,5,'#412637');
  p(-34,18,6,19,'#24202c'); p(28,18,6,19,'#24202c');
  p(-20,25,7,12,'#dcc5a1'); p(-10,24,7,13,'#ceb391');
  p(7,24,7,13,'#dcc5a1'); p(16,25,7,12,'#bda386');
  p(-26,-14,52,5,'#ad774e'); p(-22,-24,44,13,'#483447');
  p(-19,-29,38,5,'#a97555'); p(-17,-32,34,5,'#d3a264');
  p(-12,-34,24,4,'#735352');
  p(-22,-21,44,43,'#9c6b5b');
  p(-18,-18,36,36,'#e8d2ae');
  p(-15,-15,30,30,'#f6e6bc');
  p(-2,-15,4,31,'#c3997b'); p(-15,-2,30,3,'#c3997b');
  p(-1,-11,3,12,'#423044'); p(1,-1,10,3,'#423044');
  p(-4,-4,8,7,'#ed6068'); p(-2,-2,4,3,'#fff2c9');
  p(-15,19,30,5,'#ab754e');
  p(-7,31,14,16,'#231827'); p(-4,39,8,10,'#91414b');
  ctx.restore();
}

function bossDefeat(progress, t) {
  const p = Math.min(1, progress);
  if (bossSprites.complete && bossSprites.naturalWidth) {
    ctx.save();
    ctx.translate(180 + Math.sin(t * 25) * p * 4, 8 + p * 88);
    ctx.rotate(p * .25);
    ctx.scale(1 - p * .65, 1 - p * .65);
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bossSprites, 408, 0, 136, 181, -94, 0, 188, 250);
    ctx.restore();
  } else if (bossArtwork.complete && bossArtwork.naturalWidth) {
    ctx.save();
    ctx.translate(180 + Math.sin(t * 25) * p * 5, 112 + p * 95);
    ctx.rotate(p * .33);
    ctx.scale(1 - p * .72, 1 - p * .72);
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.filter = `grayscale(${p}) brightness(${1 + p * 1.2})`;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bossArtwork, -144, -95, 288, 192);
    ctx.restore();
  }
  for (let i = 0; i < 26; i++) {
    const angle = i * 2.399;
    const distance = 15 + p * (60 + i % 5 * 11);
    const x = 180 + Math.cos(angle) * distance;
    const y = 140 + Math.sin(angle) * distance - p * 27;
    pixelRect(x, y, 3 + i % 3, 3 + i % 2,
      i % 4 === 0 ? '#ffe3a0' : i % 2 ? '#f46c73' : '#6e304f');
  }
}

function note(x, y, t) {
  const bob = Math.round(Math.sin(t * 5 + x) * 2);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y + bob));
  pixelRect(-13,-15,26,30,'#edb64f55');
  pixelRect(2,-13,4,22,'#f8d26f');
  pixelRect(6,-13,8,4,'#fff0b0');
  pixelRect(-6,6,11,7,'#f8d26f');
  pixelRect(-10,10,7,5,'#fff0b0');
  ctx.restore();
}

function projectiles() {
  const landingAt = STRIKE_TIMING.warning + STRIKE_TIMING.fall;
  for (const strike of game.enemyStrikes) {
    const x = Math.round(strike.x);
    const targetY = Math.round(strike.y);
    if (strike.age < landingAt) {
      const countDown = strike.age / landingAt;
      const pulse = Math.sin(game.time * 22) > 0 ? 1 : 0;
      ctx.save();
      ctx.translate(x, targetY);
      ctx.scale(1, .58);
      ctx.fillStyle = '#8a233c88';
      ctx.strokeStyle = pulse ? '#ffad7f' : '#ff6974';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffe1a4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 21, -Math.PI / 2, -Math.PI / 2 + countDown * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      pixelRect(x - 2, targetY - 7, 4, 8, '#fff0bc');
      pixelRect(x - 2, targetY + 4, 4, 3, '#fff0bc');
      if (strike.age >= STRIKE_TIMING.warning) {
        const progress = (strike.age - STRIKE_TIMING.warning) / STRIKE_TIMING.fall;
        const fallY = Math.round(-35 + (targetY + 35) * progress * progress);
        // A small opening at the top makes the sky origin unambiguous.
        pixelRect(x - 12, 6, 24, 3, '#ff7977');
        pixelRect(x - 15, 9, 4, 13, '#f15465');
        pixelRect(x + 11, 9, 4, 13, '#f15465');
        pixelRect(x - 10, 20, 20, 3, '#ffad83');
        pixelRect(x - 5, 10, 10, 9, '#4d1830');
        pixelRect(x - 2, 12, 4, 5, '#ffe0ae');
        for (let spark = 1; spark <= 3; spark++) {
          pixelRect(x + (spark % 2 ? -6 : 5), fallY - 16 - spark * 10,
            3, 4, spark % 2 ? '#ff947b' : '#ffd1a0');
        }
        pixelRect(x - 8, fallY - 31, 16, 24, '#ff435444');
        pixelRect(x - 3, fallY - 29, 6, 19, '#ff706d88');
        pixelRect(x - 7, fallY - 10, 14, 18, '#8e203d');
        pixelRect(x - 5, fallY - 11, 10, 18, '#f4515c');
        pixelRect(x - 2, fallY - 8, 4, 11, '#ffe0ab');
        pixelRect(x - 10, fallY + 6, 5, 4, '#ff8d77');
        pixelRect(x + 6, fallY + 7, 4, 4, '#ff8d77');
      }
    } else {
      const progress = (strike.age - landingAt) / STRIKE_TIMING.impact;
      const radius = 15 + progress * 20;
      ctx.save();
      ctx.translate(x, targetY);
      ctx.scale(1, .58);
      ctx.strokeStyle = `rgba(255,150,113,${1 - progress})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        pixelRect(x + Math.cos(angle) * radius, targetY + Math.sin(angle) * radius * .6,
          4, 4, i % 2 ? '#ff6974' : '#ffe5aa');
      }
    }
  }
  for (const shot of game.playerShots) {
    const x = Math.round(shot.x);
    const y = Math.round(shot.y);
    if (shot.type === 'ultimate') {
      const pulse = Math.round(Math.sin(game.time * 20) * 2);
      pixelRect(x - 19 - pulse, y - 22 - pulse, 38 + pulse * 2, 42 + pulse * 2, '#ffd06755');
      pixelRect(x - 12, y - 16, 24, 29, '#db9c48');
      pixelRect(x - 8, y - 19, 16, 34, '#ffe396');
      pixelRect(x - 3, y - 25, 6, 43, '#fff7c7');
      pixelRect(x - 18, y + 2, 5, 5, '#ffefaf');
      pixelRect(x + 14, y - 9, 5, 5, '#ffefaf');
    } else {
      pixelRect(x - 7, y - 12, 14, 20, '#ffc86755');
      pixelRect(x - 3, y - 9, 6, 16, '#f7c762');
      pixelRect(x - 1, y - 12, 2, 15, '#fff5ba');
      pixelRect(x - 5, y + 5, 10, 3, '#e9a448');
    }
  }
}

function celebration(t) {
  const cheer = Math.max(0, t - 1.35);
  const jump = cheer > 0 ? Math.abs(Math.sin(cheer * 8)) * 24 : 0;
  const happy = {
    ...game.player, y: game.player.y - jump, groundY: game.player.y,
    moving: false, facing: 1, invulnerable: 0,
    fireFlash: 0, ultimateFlash: cheer > 0 ? .6 : 0,
  };
  drawHero(ctx, happy, game.time + t);
  if (cheer <= 0) return;
  for (let i = 0; i < 20; i++) {
    const x = game.player.x + Math.sin(i * 2.4 + cheer * 2) * (18 + i * 3);
    const y = game.player.y - 38 - ((cheer * (36 + i * 5) + i * 23) % 170);
    pixelRect(x, y, 3 + i % 3, 3 + i % 2,
      i % 3 === 0 ? '#fff3b9' : i % 2 ? '#f9bc64' : '#d4737a');
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillStyle = '#fff1b8';
  ctx.shadowColor = '#8d4d3e';
  ctx.shadowBlur = 10;
  ctx.fillText('ДЕДЛАЙН ПОВЕРЖЕН!', 180, 219);
  ctx.restore();
}

function victorySparkles(t) {
  for (let i = 0; i < 15; i++) {
    const x = 45 + (i * 79) % 280;
    const y = 46 + (i * 103) % 368 + Math.sin(t * 3 + i) * 4;
    const size = Math.sin(t * 5 + i * 2) > 0 ? 4 : 2;
    pixelRect(x, y, size, size, i % 3 ? '#ffe4a9' : '#ffffff');
  }
}

function render(visualTime) {
  ctx.clearRect(0, 0, ARENA.width, ARENA.height);
  if (scene === 'victory' && victoryArtwork.complete && victoryArtwork.naturalWidth) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(victoryArtwork, 0, 0, ARENA.width, ARENA.height);
    ctx.restore();
    victorySparkles(visualTime);
    return;
  }
  background(game.time + (scene === 'death' ? sceneTime : 0));
  drawArenaStage(ctx, game.time + (scene === 'death' ? sceneTime : 0));
  if (scene === 'death') {
    if (sceneTime < 1.55) bossDefeat(sceneTime / 1.55, game.time + sceneTime);
    celebration(sceneTime);
    return;
  }
  boss(game.time, game.boss);
  for (const pickup of game.notes) note(pickup.x, pickup.y, game.time);
  projectiles();
  drawHero(ctx, game.player, game.time);
}

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (scene === 'playing' && running && lifecycle.canAdvance()) {
    const input = { ...controls.vector(), fire: controls.consumeFire(), ultimate: controls.consumeUltimate() };
    stepGame(game, dt, input);
    soundEvents();
    playMelody(dt);
    updateHud();
    if (game.status === 'won') {
      scene = 'death';
      sceneTime = 0;
      page.classList.add('is-ending');
      controls.clear();
      announcer.textContent = 'Дедлайн повержен. Никита празднует победу!';
      [220, 165, 110].forEach((pitch, i) => tone(pitch, .38, .04, 'sawtooth', i * .12));
    } else if (game.status === 'lost') showEnd('lost');
  } else if (scene === 'death' && lifecycle.canAdvance()) {
    sceneTime += dt;
    if (sceneTime >= 3.4) showEnd('won');
  }
  render(now / 1000);
  requestAnimationFrame(frame);
}

updateHud();
requestAnimationFrame(frame);
