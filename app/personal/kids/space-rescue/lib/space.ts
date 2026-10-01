import { LEVELS, WORLD, type GameState } from "./game";

type Context = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const INK = "#14243e", MINT = "#7bf3bd", CREAM = "#fff7dc";
const COLORS = [MINT, "#79c9ff", "#ffad86", "#c8a0ff"];

function ellipse(ctx: Context, x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, TAU); ctx.fill();
}
function round(ctx: Context, x: number, y: number, w: number, h: number, radius: number, color: string) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
}
function polygon(ctx: Context, points: number[], fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath(); ctx.fill();
}
function line(ctx: Context, points: number[], color: string, width = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]); ctx.stroke();
}
function ring(ctx: Context, x: number, y: number, r: number, color: string, width = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}
function star(ctx: Context, x: number, y: number, r: number, color: string, rotation = 0) {
  const points: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2 + rotation, radius = i % 2 ? r * 0.45 : r;
    points.push(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  polygon(ctx, points, color);
}
function text(ctx: Context, label: string, x: number, y: number, size: number, color = CREAM, align: CanvasTextAlign = "left") {
  ctx.fillStyle = color; ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`; ctx.textAlign = align; ctx.fillText(label, x, y);
}
function hash(n: number) { return Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1; }

/** Stars, atmosphere and planets are painted once per sector, not every animation frame. */
function background(level: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = WORLD.width; canvas.height = WORLD.height;
  const ctx = canvas.getContext("2d")!;
  const skies = ["#12283c", "#172843", "#30253d", "#292346"];
  const glowColors = ["#65deb422", "#68bcf322", "#fcb67f22", "#c899ff2c"];
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, skies[level]); sky.addColorStop(0.65, "#111d33"); sky.addColorStop(1, "#0b172b");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const glow = ctx.createRadialGradient(800, 100, 10, 800, 100, 480);
  glow.addColorStop(0, glowColors[level]); glow.addColorStop(1, "#17283c00");
  ctx.fillStyle = glow; ctx.fillRect(300, 0, 660, 600);
  for (let i = 0; i < 135; i++) {
    const x = hash(i + 20) * WORLD.width, y = hash(i + 160) * 655;
    const r = i % 13 === 0 ? 1.8 : 0.7 + hash(i + 300) * 0.6;
    ellipse(ctx, x, y, r, r, i % 3 === 0 ? "#bdcdf18a" : "#cedbe044");
    if (i % 27 === 0) { line(ctx, [x - 4, y, x + 4, y], "#d9e0f047", 1); line(ctx, [x, y - 4, x, y + 4], "#d9e0f047", 1); }
  }
  // Fine orbital charts add texture without hiding incoming shots.
  ctx.strokeStyle = "#9dc3e009"; ctx.lineWidth = 1;
  for (const r of [190, 250, 310]) { ctx.beginPath(); ctx.ellipse(90, 190, r, r * 0.43, -0.3, 0, TAU); ctx.stroke(); }
  const planetX = -13, planetY = 179, planetR = 123;
  const planet = ctx.createLinearGradient(-125, 80, 115, 230);
  planet.addColorStop(0, ["#90d3a3", "#8cb9dd", "#d4a486", "#b2a0d4"][level]);
  planet.addColorStop(1, ["#294957", "#33435f", "#554255", "#413b64"][level]);
  ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(planetX, planetY, planetR, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(planetX, planetY, planetR, 0, TAU); ctx.clip();
  if (level === 0) {
    ellipse(ctx, 51, 106, 32, 12, "#b8e9bd30", -0.4); ellipse(ctx, 59, 215, 35, 21, "#152c3b27", 0.2);
    ellipse(ctx, 11, 166, 12, 15, "#14394929"); ellipse(ctx, 78, 162, 9, 10, "#b8e9bd22");
  } else {
    for (let i = 0; i < 8; i++) { ctx.strokeStyle = i % 2 ? "#ffffff0b" : "#111c3320"; ctx.lineWidth = 12 + i % 3 * 3; ctx.beginPath(); ctx.ellipse(-5, 76 + i * 27, 148, 28, -0.3, 0, TAU); ctx.stroke(); }
  }
  ctx.restore();
  if (level === 2 || level === 3) {
    ctx.strokeStyle = level === 2 ? "#f2ba8740" : "#cab8ef40"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.ellipse(planetX, planetY, 174, 37, -0.35, 0, Math.PI); ctx.stroke();
  }
  ellipse(ctx, 787, 500, 24, 24, "#23394c"); ellipse(ctx, 794, 494, 19, 19, "#304453");
  ellipse(ctx, 788, 489, 4, 5, "#253947"); ellipse(ctx, 801, 499, 3, 3, "#243748");
  ctx.strokeStyle = "#81c9aa15"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(490, 997, 705, 414, 0, Math.PI, TAU); ctx.stroke();
  return canvas;
}

function soccerBall(ctx: Context, x: number, y: number, r: number, color = CREAM) {
  ellipse(ctx, x, y, r, r, color);
  polygon(ctx, [x, y - r * 0.45, x + r * 0.44, y - r * 0.14, x + r * 0.27, y + r * 0.36, x - r * 0.27, y + r * 0.36, x - r * 0.44, y - r * 0.14], INK);
  if (r > 8) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      line(ctx, [x + Math.cos(a) * r * 0.49, y + Math.sin(a) * r * 0.49, x + Math.cos(a) * r * 0.94, y + Math.sin(a) * r * 0.94], INK, 1.4);
    }
  }
}
function baseball(ctx: Context, x: number, y: number, r: number) {
  ellipse(ctx, x, y, r, r, CREAM);
  ctx.strokeStyle = "#ed7b7c"; ctx.lineWidth = Math.max(1.2, r * 0.13);
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + side * r * 0.3, y - r * 0.86);
    ctx.quadraticCurveTo(x + side * r * 0.83, y, x + side * r * 0.3, y + r * 0.86); ctx.stroke();
    if (r > 10) for (let j = -1; j <= 1; j++) line(ctx, [x + side * r * 0.44, y + j * r * 0.4, x + side * r * 0.67, y + j * r * 0.4 - r * 0.12], "#ed7b7c", 1.5);
  }
}
function eyes(ctx: Context, spread: number, y: number, r: number, glance = 0) {
  for (const side of [-1, 1]) {
    ellipse(ctx, side * spread, y, r, r * 1.18, CREAM);
    ellipse(ctx, side * spread + glance, y + 1, r * 0.43, r * 0.57, INK);
    ellipse(ctx, side * spread + glance - 1, y - 1, r * 0.13, r * 0.17, "#ffffff");
  }
}
function alien(ctx: Context, x: number, y: number, radius: number, kind: number, t: number, hp: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(radius / 20, radius / 20);
  const wiggle = Math.sin(t * 3 + x * 0.01) * 2;
  if (kind === 0) {
    line(ctx, [-9, -13, -13, -25], "#7fdda3", 3); line(ctx, [9, -13, 13, -25], "#7fdda3", 3);
    ellipse(ctx, -13, -25, 3, 3, "#d6f8b2"); ellipse(ctx, 13, -25, 3, 3, "#d6f8b2");
    for (const side of [-1, 1]) line(ctx, [side * 15, 8, side * 24, 15 + wiggle, side * 22, 21], "#59b79c", 5);
    round(ctx, -22, -16, 44, 34, 14, "#61c8a5"); round(ctx, -18, -16, 36, 21, 12, "#99e4b1");
    eyes(ctx, 8, -2, 6); line(ctx, [-4, 11, 4, 11], INK, 2);
  } else if (kind === 1) {
    for (let i = -1; i <= 1; i++) line(ctx, [i * 11, 8, i * 14 + wiggle, 22, i * 17 - 3, 24], "#9f8ddc", 5);
    ellipse(ctx, 0, -3, 23, 21, "#b6a4f4"); ellipse(ctx, -5, -10, 12, 7, "#d2c4ff");
    ellipse(ctx, 0, -1, 10, 11, CREAM); ellipse(ctx, 1, 0, 4.5, 6, INK);
    line(ctx, [-5, 14, 0, 16, 5, 14], INK, 2);
  } else {
    ellipse(ctx, 0, -2, 20, 16, "#fcb990"); ellipse(ctx, 0, -5, 13, 10, "#ffe0b4");
    ellipse(ctx, 0, 7, 29, 9, "#e79384"); ellipse(ctx, 0, 4, 27, 7, "#ffc5a0");
    eyes(ctx, 6, -7, 4.4);
    for (let i = -1; i <= 1; i++) ellipse(ctx, i * 17, 7, 2.5, 2, CREAM);
    polygon(ctx, [-8, 16, 0, 20 + wiggle, 8, 16], "#f5ac7880");
  }
  if (hp > 1) { ring(ctx, 0, 0, 29, "#d2e8fa50", 2); star(ctx, 21, -23, 5, CREAM); }
  ctx.restore();
}

function paw(ctx: Context, x: number, y: number, scale: number, color: string) {
  ellipse(ctx, x, y + 4 * scale, 10 * scale, 8 * scale, color);
  for (const [dx, dy, angle] of [[-12, -5, -0.4], [-5, -12, -0.15], [5, -12, 0.15], [12, -5, 0.4]]) ellipse(ctx, x + dx * scale, y + dy * scale, 4 * scale, 5.7 * scale, color, angle);
}
function rescuePortrait(ctx: Context, level: number) {
  if (level === 0) { paw(ctx, 0, 0, 1.3, CREAM); return; }
  // Tiny invented, friendly illustrations; these do not claim a photographic likeness.
  if (level === 3) ellipse(ctx, 0, 0, 22, 26, "#694653");
  round(ctx, -24, 13, 48, 28, 16, COLORS[level]);
  ellipse(ctx, 0, -2, 17, 21, "#f2c09d");
  if (level === 1) {
    ellipse(ctx, 0, -19, 20, 10, "#5d94bc"); round(ctx, -4, -18, 33, 6, 3, "#b0daf0");
  } else if (level === 2) {
    ellipse(ctx, 0, -19, 18, 8, "#604a49");
    polygon(ctx, [-15, 4, -10, 20, 0, 24, 10, 20, 15, 4, 7, 8, 0, 12, -7, 8], "#76514e");
  } else {
    ellipse(ctx, -13, -13, 10, 15, "#694653", 0.4); ellipse(ctx, 10, -20, 12, 7, "#694653", 0.4);
  }
  ellipse(ctx, -6, -1, 1.8, 2.5, INK); ellipse(ctx, 6, -1, 1.8, 2.5, INK);
  ctx.strokeStyle = "#9e5b50"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 4, 6, 0.15, Math.PI - 0.15); ctx.stroke();
  if (level === 1) soccerBall(ctx, 17, 25, 10);
  if (level === 2) baseball(ctx, 17, 25, 10);
  if (level === 3) star(ctx, 17, 24, 10, CREAM);
}
function rescuePod(ctx: Context, level: number, t: number, saved: boolean) {
  const x = 877, y = 55 + Math.sin(t * 1.4) * 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(0.8, 0.8);
  ellipse(ctx, 0, 55, 35, 6, "#060f202e");
  if (saved) { ring(ctx, 0, 0, 55, "#7bf3bd66", 2); star(ctx, -40, -32, 8, MINT); star(ctx, 43, 30, 6, CREAM); }
  round(ctx, -43, -47, 86, 96, 36, "#425369");
  round(ctx, -38, -42, 76, 86, 31, "#afc8d7");
  round(ctx, -33, -37, 66, 76, 26, "#233950");
  ctx.save(); round(ctx, -32, -36, 64, 74, 26, "#284156"); ctx.clip();
  rescuePortrait(ctx, level);
  polygon(ctx, [-32, -37, -18, -37, 28, 38, 15, 38], "#edf7ff0e"); ctx.restore();
  round(ctx, -37, 29, 74, 19, 7, saved ? MINT : COLORS[level]);
  text(ctx, saved ? "SAFE!" : LEVELS[level].rescue.toUpperCase(), 0, 43, 12, INK, "center");
  ellipse(ctx, -45, -7, 5, 10, COLORS[level]); ellipse(ctx, 45, -7, 5, 10, COLORS[level]);
  line(ctx, [-14, -48, 14, -48], "#d7e3e9", 4); ellipse(ctx, 0, -55, 4, 4, COLORS[level]);
  ctx.restore();
}

function bossArt(ctx: Context, level: number, t: number, warning: boolean) {
  const sway = Math.sin(t * 2) * 5;
  if (level === 0) {
    // Snack Snatcher: a mint crab with cookie pincers and two very curious eyes.
    for (const side of [-1, 1]) {
      line(ctx, [side * 30, 2, side * 59, -17 + sway, side * 71, -37 + sway], "#58b598", 12);
      ellipse(ctx, side * 72, -43 + sway, 20, 23, "#c89460", side * 0.25);
      ellipse(ctx, side * 72, -47 + sway, 16, 18, "#efd49b", side * 0.25);
      for (let i = 0; i < 4; i++) ellipse(ctx, side * 72 + Math.sin(i * 2) * 10, -47 + sway + Math.cos(i * 2) * 11, 2.6, 2.6, "#9b6e4d");
      for (let leg = 0; leg < 2; leg++) line(ctx, [side * 26, 18 + leg * 12, side * (48 + leg * 9), 35 + leg * 10, side * (52 + leg * 13), 44 + leg * 10], "#5bbb9c", 8);
      line(ctx, [side * 20, -25, side * 29, -53], "#83d7ae", 8);
      ellipse(ctx, side * 29, -55, 12, 15, CREAM); ellipse(ctx, side * 29 + side * 1.5, -54, 5, 8, INK);
    }
    round(ctx, -46, -29, 92, 77, 31, "#69c9a3"); round(ctx, -39, -23, 78, 41, 23, "#a2e2b1");
    ellipse(ctx, 0, 14, 18, 12, INK); ellipse(ctx, 0, 20, 11, 5, "#f59c9f");
    round(ctx, -9, 2, 8, 8, 2, CREAM); round(ctx, 2, 2, 8, 8, 2, CREAM);
    paw(ctx, 0, -10, 0.48, "#498e7d");
  } else if (level === 1) {
    // Goal Gobbler: a floating goal keeper with net wings and a football belly.
    for (const side of [-1, 1]) {
      polygon(ctx, [side * 34, -29, side * 76, -19, side * 77, 35, side * 32, 25], "#93d2ed22");
      line(ctx, [side * 34, -29, side * 76, -19, side * 77, 35, side * 32, 25], "#bfdef5", 5);
      for (let i = 1; i <= 3; i++) line(ctx, [side * (34 + i * 10), -27 + i * 2, side * (34 + i * 10), 25 + i * 2], "#bfdef570", 1.5);
      for (let i = 0; i < 3; i++) line(ctx, [side * 36, -11 + i * 13, side * 74, -3 + i * 13], "#bfdef570", 1.5);
      line(ctx, [side * 32, 23, side * 47, 49 + sway, side * 31, 59], "#91a2e8", 10);
      round(ctx, side * 75 - 11, -26 + sway, 22, 26, 9, "#eaf3df");
    }
    ellipse(ctx, 0, 0, 44, 49, "#818fda"); ellipse(ctx, 0, -9, 39, 36, "#a3b5ed");
    eyes(ctx, 14, -16, 9); soccerBall(ctx, 0, 20, 22);
    polygon(ctx, [-25, -43, 0, -60, 25, -43], "#bde9ee"); star(ctx, 0, -44, 8, INK);
  } else if (level === 2) {
    // Grand Slam Saucer: a stitched baseball cockpit and twin bat engines.
    for (const side of [-1, 1]) {
      line(ctx, [side * 41, 19, side * 75, 49 + sway], "#c58d5f", 15);
      line(ctx, [side * 45, 23, side * 72, 46 + sway], "#efd4a2", 9);
      line(ctx, [side * 29, 10, side * 43, 23], "#c58d5f", 5);
    }
    ellipse(ctx, 0, 4, 45, 40, "#a97385"); baseball(ctx, 0, -9, 38);
    round(ctx, -27, -22, 54, 24, 10, INK); eyes(ctx, 12, -12, 7);
    ellipse(ctx, 0, 24, 82, 23, "#c67e86"); ellipse(ctx, 0, 17, 83, 21, "#f4ae91");
    ellipse(ctx, 0, 11, 55, 12, "#ffd2a8");
    for (let i = -2; i <= 2; i++) ellipse(ctx, i * 28, 24, 5, 4, i % 2 ? "#9e6578" : CREAM);
    polygon(ctx, [-19, 39, -10, 56 + sway, 0, 46, 10, 56 - sway, 19, 39], "#f8c98188");
    round(ctx, -20, -48, 40, 11, 5, "#627eb0"); round(ctx, -4, -40, 35, 6, 3, "#89a2ce");
  } else {
    // Cosmic Crown: an enormous floating jelly with a star-studded royal cape.
    for (let i = -2; i <= 2; i++) {
      const x = i * 20;
      ctx.strokeStyle = i % 2 ? "#b28bd5" : "#e5a2c7"; ctx.lineWidth = 13; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, 17); ctx.bezierCurveTo(x - 18, 39, x + 20, 45, x + Math.sin(t * 2 + i) * 13, 63 - Math.abs(i) * 4); ctx.stroke();
    }
    ellipse(ctx, 0, -1, 58, 47, "#a27cd1"); ellipse(ctx, -7, -10, 48, 37, "#c7a0eb");
    ellipse(ctx, -27, -23, 12, 7, "#e4c1f7", -0.5); eyes(ctx, 18, -5, 10);
    line(ctx, [-9, 18, 0, 22, 9, 18], INK, 3);
    polygon(ctx, [-34, -38, -43, -59, -17, -50, 0, -68, 17, -50, 43, -59, 34, -38], "#f3d19a");
    round(ctx, -36, -43, 72, 12, 5, "#ffdfaa");
    star(ctx, 0, -52, 7, "#986dd0"); ellipse(ctx, -42, -60, 4, 4, CREAM); ellipse(ctx, 42, -60, 4, 4, CREAM);
    star(ctx, -40, 17, 7, CREAM); star(ctx, 40, 17, 7, CREAM);
  }
  if (warning) {
    round(ctx, -18, 70, 36, 23, 9, "#ffca91"); text(ctx, "!", 0, 88, 20, INK, "center");
  }
}

function boss(ctx: Context, game: GameState, t: number, reduced: boolean) {
  const b = game.boss;
  if (!b) return;
  if (b.warning) {
    ctx.save(); ctx.globalAlpha = 0.75;
    const warningX = b.aimX;
    if (game.level === 2) {
      for (const x of b.lanes) {
        ctx.fillStyle = "#ffad8613"; ctx.fillRect(x - 22, b.y + b.radius, 44, WORLD.controlTop - b.y - b.radius);
        line(ctx, [x, b.y + b.radius + 25, x, WORLD.controlTop - 20], "#ffbf8750", 2);
        polygon(ctx, [x - 6, 562, x, 572, x + 6, 562], "#ffd5a4");
      }
    } else {
      ctx.setLineDash([8, 10]); line(ctx, [b.x, b.y + b.radius + 8, warningX, WORLD.shipY], "#ffc89475", 2); ctx.setLineDash([]);
      ring(ctx, warningX, WORLD.shipY, 29, "#ffc894", 2);
      line(ctx, [warningX - 39, WORLD.shipY, warningX - 31, WORLD.shipY], "#ffc894", 2);
      line(ctx, [warningX + 31, WORLD.shipY, warningX + 39, WORLD.shipY], "#ffc894", 2);
    }
    ctx.restore();
    ring(ctx, b.x, b.y, b.radius + 23 + (reduced ? 0 : Math.sin(t * 3) * 3), "#ffc89445", 3);
  }
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.radius / 51, b.radius / 51); bossArt(ctx, game.level, t, b.warning); ctx.restore();
  const width = 300, left = WORLD.width / 2 - width / 2;
  text(ctx, LEVELS[game.level].bossName.toUpperCase(), WORLD.width / 2, 27, 15, CREAM, "center");
  round(ctx, left, 37, width, 10, 5, "#080f2355");
  const hp = Math.max(0, Math.min(1, b.hp / b.maxHp));
  if (hp > 0) round(ctx, left, 37, Math.max(4, width * hp), 10, 5, COLORS[game.level]);
}

function player(ctx: Context, game: GameState, t: number, reduced: boolean) {
  const x = game.playerX, y = WORLD.shipY;
  ctx.save(); ctx.translate(x, y);
  if (game.shield > 0 || game.invulnerable > 0) {
    ellipse(ctx, 0, -4, 43, 43, "#7bf3bd14"); ring(ctx, 0, -4, 42, game.invulnerable > 0 ? "#fff7dca0" : "#7bf3bd99", 2);
    if (!reduced) ring(ctx, 0, -4, 46 + Math.sin(t * 4) * 2, "#7bf3bd30", 1.5);
  }
  const flame = reduced ? 14 : 14 + Math.sin(t * 22) * 4;
  polygon(ctx, [-10, 14, -6, 27 + flame, 0, 22 + flame * 0.75, 6, 27 + flame, 10, 14], "#ffbd7b");
  polygon(ctx, [-5, 13, 0, 28 + flame * 0.6, 5, 13], CREAM);
  polygon(ctx, [-12, -4, -31, 19, -29, 26, -10, 19, 10, 19, 29, 26, 31, 19, 12, -4], "#588cab");
  polygon(ctx, [-11, -9, -28, 17, -14, 12, 0, -10, 14, 12, 28, 17, 11, -9], "#7ed3c1");
  // The compact visual hull and small center light explain the forgiving collision center.
  ctx.fillStyle = "#deefe4"; ctx.beginPath(); ctx.moveTo(0, -35); ctx.bezierCurveTo(-15, -21, -17, 0, -12, 19); ctx.lineTo(12, 19); ctx.bezierCurveTo(17, 0, 15, -21, 0, -35); ctx.closePath(); ctx.fill();
  polygon(ctx, [0, -35, 0, 17, 12, 17, 13, -4, 8, -25], "#8ad7c0");
  ellipse(ctx, 0, -11, 9, 13, INK); ellipse(ctx, -2, -15, 5, 8, "#689eaf");
  round(ctx, -8, 5, 16, 9, 2, "#efb4a7"); line(ctx, [-7, 9, 7, 9], "#fff7dc", 2);
  round(ctx, -8, 5, 7, 6, 1, "#52759c"); star(ctx, -4.5, 8, 2.1, CREAM);
  if (game.weaponTier >= 2) { round(ctx, -23, -2, 6, 14, 3, CREAM); round(ctx, 17, -2, 6, 14, 3, CREAM); }
  if (game.weaponTier >= 3) { ellipse(ctx, -24, 8, 3, 3, "#ffb68b"); ellipse(ctx, 24, 8, 3, 3, "#ffb68b"); }
  if (game.weaponTier >= 4) star(ctx, 0, -23, 5, CREAM);
  ellipse(ctx, 0, 0, 2.5, 2.5, "#ffffff");
  ctx.restore();
}

function controls(ctx: Context, game: GameState) {
  const top = WORLD.controlTop;
  ctx.fillStyle = "#0a1527eb"; ctx.fillRect(0, top, WORLD.width, WORLD.height - top);
  line(ctx, [0, top, WORLD.width, top], "#7bf3bd35", 1);
  for (let i = 1; i < 16; i++) line(ctx, [i * 60, top + 11, i * 60, top + 17], "#9cc7c733", 1);
  line(ctx, [38, top + 35, 143, top + 35], "#527479", 2);
  line(ctx, [38, top + 35, 46, top + 29], "#7ec1b1", 2); line(ctx, [38, top + 35, 46, top + 41], "#7ec1b1", 2);
  line(ctx, [817, top + 35, 922, top + 35], "#527479", 2);
  line(ctx, [922, top + 35, 914, top + 29], "#7ec1b1", 2); line(ctx, [922, top + 35, 914, top + 41], "#7ec1b1", 2);
  text(ctx, "DRAG TO STEER", WORLD.width / 2, top + 44, 15, "#b3d0d0", "center");
  round(ctx, game.playerX - 36, top + 7, 72, 5, 2.5, "#7bf3bd");
}

export function createSpaceRenderer(): (ctx: Context, game: GameState, time: number, reducedMotion: boolean) => void {
  let paintedLevel = -1, cachedBackground: HTMLCanvasElement | null = null;
  return (ctx, game, time, reducedMotion) => {
    const level = Math.max(0, Math.min(3, game.level));
    if (paintedLevel !== level || !cachedBackground) { cachedBackground = background(level); paintedLevel = level; }
    ctx.save();
    ctx.drawImage(cachedBackground, 0, 0);
    const t = reducedMotion ? 0 : time / 1000;
    if (!reducedMotion) {
      for (let i = 0; i < 11; i++) {
        const x = hash(i + 600) * 940 + 10, y = (hash(i + 700) * 640 + t * (4 + i % 3)) % 640;
        ellipse(ctx, x, y, 1.5, 1.5, "#c4e6e844");
      }
    }
    rescuePod(ctx, level, t, game.phase === "rescued" || game.phase === "won");
    for (const a of game.aliens) alien(ctx, a.x, a.y, a.radius, a.kind, t, a.hp);
    boss(ctx, game, t, reducedMotion);
    for (const shot of game.shotsPlayer) {
      line(ctx, [shot.x, shot.y + 3, shot.x - shot.vx * 0.026, shot.y + 19], "#7bf3bd33", Math.max(3, shot.radius));
      if (shot.kind === "baseball") baseball(ctx, shot.x, shot.y, shot.radius);
      else if (shot.kind === "star") star(ctx, shot.x, shot.y, shot.radius + 2, "#dafbb5", t * 2);
      else soccerBall(ctx, shot.x, shot.y, shot.radius, "#c4f5c8");
    }
    for (const shot of game.shotsEnemy) {
      line(ctx, [shot.x - shot.vx * 0.034, shot.y - Math.max(12, shot.vy * 0.034), shot.x, shot.y], "#ffb28a45", shot.radius * 1.3);
      ellipse(ctx, shot.x, shot.y, shot.radius + 2, shot.radius + 2, "#071323");
      ellipse(ctx, shot.x, shot.y, shot.radius, shot.radius, "#ff986f");
      ellipse(ctx, shot.x - shot.radius * 0.2, shot.y - shot.radius * 0.22, shot.radius * 0.55, shot.radius * 0.55, "#ffdf9c");
    }
    player(ctx, game, t, reducedMotion);
    for (const e of game.effects) {
      const p = Math.min(1, e.age / Math.max(0.001, e.life)), color = e.color || (e.kind === "hit" ? "#ffad86" : COLORS[level]);
      ctx.globalAlpha = 1 - p;
      if (e.kind === "upgrade" || e.kind === "rescue") {
        ring(ctx, e.x, e.y, 28 + p * (reducedMotion ? 14 : 100), color, 3);
        for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8, r = 25 + p * (reducedMotion ? 10 : 85);
          star(ctx, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 5 * (1 - p) + 2, color, a);
        }
      } else {
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6, r = 8 + p * (reducedMotion ? 10 : 34);
          ellipse(ctx, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 3.5 * (1 - p) + 1, 3.5 * (1 - p) + 1, color);
        }
      }
      ctx.globalAlpha = 1;
    }
    controls(ctx, game);
    ctx.restore();
  };
}
