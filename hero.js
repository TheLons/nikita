// Four separate poses share one transparent pixel-art sheet. The block sprite
// below remains a fallback if the artwork has not loaded yet.
const spriteSheet = new Image();
spriteSheet.src = new URL('./assets/nikita-sprites.png', import.meta.url).href;
const walkSheet = new Image();
walkSheet.src = new URL('./assets/nikita-walk.png', import.meta.url).href;
const poses = [
  [20, 235, 430, 525],   // idle
  [485, 235, 440, 525],  // left step
  [940, 235, 440, 525],  // right step
  [1435, 235, 500, 525], // cast
];

// Keep the tiny fallback face and the costume in one place for later revisions.
const C = {
  outline: '#171323',
  deep: '#262238',
  cape: '#393044',
  capeShade: '#2c2437',
  capeLight: '#665066',
  coat: '#34394b',
  coatLight: '#59677a',
  coatShade: '#292d3f',
  steel: '#8c9296',
  goldDark: '#916039',
  gold: '#d7a65e',
  goldLight: '#f5d486',
  ember: '#a56a4e',
  hairDark: '#916b41',
  hair: '#d8b16d',
  hairLight: '#f6dc9a',
  skinShade: '#a86f5a',
  skin: '#dba283',
  skinLight: '#f4c49d',
  boot: '#29242e',
};

function px(ctx, color, rects) {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h);
}

export function drawHero(ctx, player, time = 0) {
  const pace = player.moving ? Math.sin(player.walkTime * 1.5) : 0;
  const step = Math.round(pace * 2);
  const sway = player.moving ? Math.round(Math.sin(player.walkTime * 1.5 + 1) * 2) : 0;
  const flutter = Math.round(Math.sin(time * 7 + player.walkTime) * (player.moving ? 2 : 1));
  const fire = player.fireFlash > 0;
  const ultimate = player.ultimateFlash > 0;
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const groundY = player.groundY ?? player.y;

  if (spriteSheet.complete && spriteSheet.naturalWidth) {
    const useWalk = player.moving && !ultimate && walkSheet.complete && walkSheet.naturalWidth;
    const pose = ultimate || (fire && !player.moving) ? 3
      : player.moving ? 1 + (Math.floor(player.walkTime * .9) % 2) : 0;
    const [sx, sy, sw, sh] = poses[pose];
    ctx.fillStyle = '#0b0b1c99';
    ctx.fillRect(x - 18, Math.round(groundY - 3), 36, 5);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(player.facing === -1 ? -1 : 1, 1);
    if (player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = .45;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (useWalk) {
      const frame = Math.floor(player.walkTime * .9) % 4;
      ctx.drawImage(walkSheet, frame * 128, 0, 128, 192, -32, -84, 64, 84);
      if (fire) {
        ctx.fillStyle = '#ffe7a0';
        ctx.fillRect(24, -62, 4, 8);
        ctx.fillRect(20, -58, 12, 3);
        ctx.fillStyle = '#fff8d4';
        ctx.fillRect(24, -59, 5, 4);
      }
    } else {
      ctx.drawImage(spriteSheet, sx, sy, sw, sh, -38, -84, 76, 84);
    }
    if (ultimate) {
      ctx.fillStyle = '#fff0ad';
      ctx.fillRect(-30, -89, 3, 6);
      ctx.fillRect(24, -99, 3, 6);
      ctx.fillRect(-12, -111, 3, 6);
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#0b0b1c99';
  ctx.fillRect(x - 17, Math.round(groundY - 3), 34, 5);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(player.facing === -1 ? -2 : 2, 2);
  if (player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = .45;

  // Split boots, shifting weight and coat tails make the walk readable.
  px(ctx, C.outline, [[-5 + step, -10, 5, 10], [1 - step, -10, 5, 10]]);
  px(ctx, C.boot, [[-4 + step, -7, 3, 6], [2 - step, -7, 3, 6]]);
  px(ctx, C.steel, [[-4 + step, -4, 2, 1], [2 - step, -4, 2, 1]]);
  px(ctx, C.outline, [[-6 + step, -1, 6, 2], [1 - step, -1, 6, 2]]);

  // Asymmetrical, windblown cape silhouette like the supplied sprite reference.
  px(ctx, C.outline, [[-9 + flutter, -25, 5, 5], [-11 + flutter, -21, 5, 10],
    [-10 + flutter, -12, 4, 7], [-12 + flutter, -6, 6, 3],
    [-13 + flutter, -3, 4, 2], [-11 + flutter, -1, 3, 1],
    [6 + flutter, -23, 4, 9], [8 + flutter, -14, 4, 9],
    [9 + flutter, -5, 4, 3], [11 + flutter, -2, 2, 2]]);
  px(ctx, C.capeShade, [[-8 + flutter, -23, 4, 16], [-10 + flutter, -9, 4, 6],
    [7 + flutter, -20, 3, 16]]);
  px(ctx, C.cape, [[-7 + flutter, -22, 3, 13], [-9 + flutter, -7, 4, 4],
    [8 + flutter, -18, 2, 12]]);
  px(ctx, C.capeLight, [[-8 + flutter, -23, 1, 11], [-10 + flutter, -6, 2, 4],
    [9 + flutter, -18, 1, 10], [10 + flutter, -5, 1, 3]]);
  px(ctx, C.ember, [[-10 + flutter, -10, 1, 4], [-12 + flutter, -3, 2, 1],
    [10 + flutter, -11, 1, 5]]);

  // Narrow torso, angled shoulder plates and layered coat panels.
  px(ctx, C.outline, [[-7, -25, 14, 16], [-6, -10, 5, 6], [-7, -4, 4, 3],
    [-8, -1, 3, 1], [1, -10, 6, 6], [3, -4, 5, 3], [5, -1, 3, 1]]);
  px(ctx, C.coatShade, [[-6, -24, 12, 15], [-5, -10, 4, 8], [1, -10, 5, 8]]);
  px(ctx, C.coat, [[-5, -23, 10, 13], [-5, -9, 3, 6], [-6, -3, 2, 2],
    [2, -9, 3, 6], [4, -3, 2, 2]]);
  px(ctx, C.coatLight, [[-6, -23, 3, 7], [4, -23, 2, 10],
    [-5, -9, 1, 7], [4, -9, 1, 6]]);
  px(ctx, C.steel, [[-7, -23, 4, 2], [4, -23, 3, 2], [-6, -21, 2, 1]]);
  px(ctx, C.goldDark, [[-5, -13, 10, 2], [-2, -22, 4, 12], [-5, -8, 1, 6]]);
  px(ctx, C.gold, [[-5, -13, 10, 1], [-1, -22, 2, 9], [-4, -8, 1, 6],
    [4, -8, 1, 5], [0, -13, 2, 2]]);
  px(ctx, C.goldLight, [[-2, -22, 3, 2], [0, -19, 1, 2], [0, -15, 1, 1]]);
  px(ctx, C.goldDark, [[-5, -22, 2, 2], [-3, -20, 2, 2], [-1, -18, 2, 2],
    [1, -16, 2, 2]]);
  px(ctx, C.gold, [[-4, -22, 1, 2], [-2, -20, 1, 2], [0, -18, 1, 2],
    [2, -16, 1, 2]]);
  px(ctx, C.steel, [[-5, -15, 1, 2], [4, -14, 1, 2], [-3, -7, 1, 1],
    [3, -7, 1, 1]]);

  // Small neck, slim face, and short side-parted blond hair.
  px(ctx, C.outline, [[-5, -37, 10, 13], [-3, -26, 6, 3]]);
  px(ctx, C.skinShade, [[-4, -34, 8, 8], [-2, -26, 4, 3]]);
  px(ctx, C.skin, [[-3, -34, 7, 7], [-2, -27, 5, 1], [-1, -25, 3, 2]]);
  px(ctx, C.skinLight, [[-3, -33, 3, 5], [0, -32, 2, 4]]);
  px(ctx, C.hairDark, [[-5, -37, 9, 4], [-4, -39, 8, 2], [-5, -34, 2, 5],
    [4, -35, 1, 4]]);
  px(ctx, C.hair, [[-5, -37, 9, 3], [-3, -39, 7, 2], [-4, -34, 3, 2],
    [2, -37, 3, 3]]);
  px(ctx, C.hairLight, [[-3, -39, 6, 1], [-4, -37, 5, 1], [1, -36, 3, 1]]);
  px(ctx, C.outline, [[-2, -31, 1, 1], [2, -31, 1, 1]]);
  px(ctx, C.skinShade, [[1, -29, 1, 1], [-1, -27, 2, 1]]);
  px(ctx, C.goldDark, [[-3, -24, 7, 2]]);
  px(ctx, C.goldLight, [[-2, -24, 4, 1]]);

  // Left arm swings. Right arm changes silhouette when firing.
  px(ctx, C.outline, [[-9, -23 + sway, 4, 12]]);
  px(ctx, C.coat, [[-8, -22 + sway, 2, 9]]);
  px(ctx, C.steel, [[-9, -20 + sway, 1, 5]]);
  px(ctx, C.skinShade, [[-8, -12 + sway, 3, 2]]);
  px(ctx, C.skinLight, [[-8, -12 + sway, 2, 1]]);
  if (fire || ultimate) {
    px(ctx, C.outline, [[5, -24, 4, 5], [3, -28, 5, 5]]);
    px(ctx, C.coatLight, [[6, -23, 2, 4], [4, -27, 3, 2]]);
    px(ctx, C.skin, [[3, -29, 3, 2]]);
    px(ctx, C.goldDark, [[4, -35, 2, 9]]);
    px(ctx, C.gold, [[4, -36, 1, 10]]);
    px(ctx, C.goldLight, [[3, -38, 3, 3]]);
    if (fire) px(ctx, '#fff1b3', [[1, -39, 2, 1], [7, -37, 2, 1], [4, -41, 1, 2]]);
  } else {
    px(ctx, C.outline, [[6, -23, 4, 12]]);
    px(ctx, C.coat, [[7, -22, 2, 9]]);
    px(ctx, C.steel, [[9, -19, 1, 5]]);
    px(ctx, C.skinShade, [[7, -12, 3, 2]]);
    px(ctx, C.goldDark, [[9, -24, 2, 16]]);
    px(ctx, C.gold, [[9, -25, 1, 16]]);
    px(ctx, C.goldLight, [[8, -27, 3, 3]]);
  }

  if (ultimate) {
    const pulse = Math.floor((1 - player.ultimateFlash / .72) * 4);
    px(ctx, C.gold, [[-13 - pulse, -30, 1, 4], [12 + pulse, -26, 1, 4],
      [-6, -43 - pulse, 1, 4]]);
    px(ctx, C.goldLight, [[-14 - pulse, -31, 3, 1], [11 + pulse, -27, 3, 1],
      [-7, -44 - pulse, 3, 1]]);
  }
  ctx.restore();
}
