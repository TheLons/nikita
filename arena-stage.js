// The same four corners define both the visible arena and the hero's movement.
export const PLAYFIELD = Object.freeze({
  top: 295, bottom: 450,
  topLeft: 72, topRight: 288,
  bottomLeft: 99, bottomRight: 261,
});

export function walkBounds(y) {
  const progress = Math.max(0, Math.min(1, (y - PLAYFIELD.top) / (PLAYFIELD.bottom - PLAYFIELD.top)));
  return {
    left: PLAYFIELD.topLeft + (PLAYFIELD.bottomLeft - PLAYFIELD.topLeft) * progress,
    right: PLAYFIELD.topRight + (PLAYFIELD.bottomRight - PLAYFIELD.topRight) * progress,
  };
}

function polygon(ctx, points, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function tile(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function clockSeal(ctx, t) {
  ctx.save();
  ctx.translate(180, 369);
  ctx.scale(1, .59);
  for (const [radius, color, width] of [
    [76, '#ad7645', 3], [69, '#453342', 2], [60, '#94604a', 2], [19, '#b98554', 2],
  ]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6 - Math.PI / 2;
    const outer = 72;
    const inner = i % 3 === 0 ? 59 : 65;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = i % 3 === 0 ? '#edb76c' : '#986849';
    ctx.lineWidth = i % 3 === 0 ? 3 : 2;
    ctx.stroke();
  }
  const minute = -Math.PI / 2 + t * .035;
  const hour = -Math.PI / 2 - .18 + t * .003;
  for (const [angle, length, color, width] of [
    [minute, 48, '#efb668', 4], [hour, 34, '#be625a', 5],
  ]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  tile(ctx, -4, -4, 8, 8, '#ffe0a0');
  ctx.restore();
}

function drawShelf(ctx, x, y, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  tile(ctx, 0, 0, 47, 111, '#0a0a19');
  tile(ctx, 4, 4, 40, 105, '#211a2b');
  for (let row = 0; row < 3; row++) {
    const shelfY = 16 + row * 31;
    tile(ctx, 3, shelfY + 23, 43, 5, '#705141');
    for (let col = 0; col < 6; col++) {
      const xBook = 7 + col * 6;
      const height = 12 + (col * 7 + row * 3) % 10;
      tile(ctx, xBook, shelfY + 21 - height, 5, height,
        (col + row) % 3 === 0 ? '#734a4b' : (col + row) % 2 ? '#584356' : '#9d7656');
      tile(ctx, xBook + 1, shelfY + 23 - height, 1, height - 2, '#bf966c');
    }
  }
  tile(ctx, 0, 0, 47, 5, '#9e704c');
  tile(ctx, 0, 106, 47, 5, '#9e704c');
  ctx.restore();
}

export function drawArenaStage(ctx, t) {
  // The painted architecture stays overhead; the play surface is a tile map.
  tile(ctx, 0, 246, 360, 234, '#101020b8');
  tile(ctx, 0, 247, 360, 7, '#684452');
  tile(ctx, 0, 254, 360, 4, '#b87e52');
  polygon(ctx, [[46, 258], [314, 258], [296, 480], [64, 480]], '#282b42d6', '#7c5d52', 3);

  ctx.save();
  polygon(ctx, [[48, 260], [312, 260], [294, 480], [66, 480]], null);
  ctx.clip();
  for (let y = 271; y < 480; y += 28) {
    tile(ctx, 48, y, 264, 2, '#44435a');
    tile(ctx, 48, y + 2, 264, 1, '#1b1b30');
  }
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(180 + i * 27, 260);
    ctx.lineTo(180 + i * 38, 480);
    ctx.strokeStyle = '#424057';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 9; col++) {
      if ((row * 5 + col * 3) % 7 === 0) {
        tile(ctx, 61 + col * 31 + row % 2 * 8, 279 + row * 28, 9, 2, '#5e5361');
      }
    }
  }
  clockSeal(ctx, t);
  ctx.restore();

  // Locked side aisles read as scenery, rather than a place to walk into.
  polygon(ctx, [[0, 260], [46, 260], [64, 480], [0, 480]], '#0c0b19e8', '#53384a', 2);
  polygon(ctx, [[314, 260], [360, 260], [360, 480], [296, 480]], '#0c0b19e8', '#53384a', 2);
  drawShelf(ctx, 4, 270, false);
  drawShelf(ctx, 356, 270, true);
  drawShelf(ctx, 6, 393, false);
  drawShelf(ctx, 354, 393, true);

  // A raised clockwork dais marks where the Deadline hovers.
  tile(ctx, 65, 250, 230, 13, '#1d192b');
  tile(ctx, 76, 253, 208, 5, '#6e4c46');
  tile(ctx, 89, 258, 182, 5, '#b88055');
  for (let i = 0; i < 14; i++) {
    const x = 89 + i * 13;
    tile(ctx, x, 262, 7, 4, i % 2 ? '#5d3540' : '#8e5c4b');
  }

  const zone = [
    [PLAYFIELD.topLeft, PLAYFIELD.top],
    [PLAYFIELD.topRight, PLAYFIELD.top],
    [PLAYFIELD.bottomRight, PLAYFIELD.bottom],
    [PLAYFIELD.bottomLeft, PLAYFIELD.bottom],
  ];
  polygon(ctx, zone, '#221b3342', '#231522', 7);
  polygon(ctx, zone, null, '#b66e58', 2);
  for (let y = PLAYFIELD.top + 5; y < PLAYFIELD.bottom - 2; y += 13) {
    const { left, right } = walkBounds(y);
    tile(ctx, left - 2, y, 5, 4, '#ce8164');
    tile(ctx, right - 3, y, 5, 4, '#ce8164');
  }
  for (let x = 80; x < 285; x += 14) tile(ctx, x, PLAYFIELD.top - 2, 7, 4, '#ce8164');
  for (let x = 103; x < 261; x += 13) tile(ctx, x, PLAYFIELD.bottom - 2, 6, 4, '#ce8164');
  for (const [x, y] of [
    [PLAYFIELD.topLeft, PLAYFIELD.top], [PLAYFIELD.topRight, PLAYFIELD.top],
    [PLAYFIELD.bottomLeft, PLAYFIELD.bottom], [PLAYFIELD.bottomRight, PLAYFIELD.bottom],
  ]) {
    tile(ctx, x - 6, y - 6, 12, 12, '#3c2635');
    tile(ctx, x - 3, y - 3, 6, 6, '#f3bb74');
  }
}
