import { PIXELS_PER_METER, WORLD, type GameState } from "./game";

type Context = CanvasRenderingContext2D;
type Palette = {
  sky: string; horizon: string; sun: string; mountain: string; mountainLight: string;
  far: string; farLight: string; leaves: string; light: string; trunk: string;
  grass: string; grassLight: string; dirt: string; dirtLight: string; water: string;
};
const PALETTES: Palette[] = [
  { sky: "#88c8bc", horizon: "#f7e6a8", sun: "#fff3b8", mountain: "#8ba990", mountainLight: "#b7c5a0", far: "#53856f", farLight: "#76a083", leaves: "#245b4f", light: "#447d5f", trunk: "#644d38", grass: "#618450", grassLight: "#b9ce78", dirt: "#735344", dirtLight: "#d8b382", water: "#92c7b1" },
  { sky: "#77b6c0", horizon: "#cce3c9", sun: "#edf1ba", mountain: "#508a91", mountainLight: "#83b2ac", far: "#347a7b", farLight: "#589893", leaves: "#164f57", light: "#317774", trunk: "#355457", grass: "#498473", grassLight: "#a3d5a0", dirt: "#4c655d", dirtLight: "#bbc7a1", water: "#69cdc2" },
  { sky: "#30365f", horizon: "#b399b1", sun: "#f5dfaa", mountain: "#696784", mountainLight: "#a294ab", far: "#444f70", farLight: "#636b91", leaves: "#263c58", light: "#465f78", trunk: "#3a384d", grass: "#5a6871", grassLight: "#a5bbb0", dirt: "#494b60", dirtLight: "#aeadb0", water: "#889bbf" },
];
const TAU = Math.PI * 2;

function rounded(ctx: Context, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r); ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height); ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function ellipse(ctx: Context, x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, TAU); ctx.fill();
}
function path(ctx: Context, points: number[], color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath(); ctx.fill();
}
function line(ctx: Context, points: number[], color: string, width: number) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]); ctx.stroke();
}
function hash(n: number) { return Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1; }
function star(ctx: Context, x: number, y: number, radius: number, fill: string, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5 + rotation;
    const r = i % 2 ? radius * 0.46 : radius;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

function pine(ctx: Context, x: number, base: number, height: number, width: number, fill: string, light: string, trunk: string) {
  ctx.fillStyle = trunk; ctx.fillRect(x - width * 0.045, base - height * 0.58, width * 0.09, height * 0.58);
  for (let i = 0; i < 4; i++) {
    const y = base - height + i * height * 0.16;
    const w = width * (0.24 + i * 0.1);
    path(ctx, [x, y, x + w * 0.65, y + height * 0.21, x + w * 0.51, y + height * 0.20, x + w, y + height * 0.34, x + w * 0.22, y + height * 0.31, x, y + height * 0.35, x - w * 0.62, y + height * 0.33, x - w, y + height * 0.34, x - w * 0.42, y + height * 0.15, x - w * 0.60, y + height * 0.18], fill);
    path(ctx, [x, y + 2, x + w * 0.65, y + height * 0.21, x + w * 0.5, y + height * 0.20, x + w * 0.82, y + height * 0.31, x + 2, y + height * 0.26], light);
  }
}
function fern(ctx: Context, x: number, y: number, size: number, color: string) {
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let branch = -1; branch <= 1; branch++) {
    const endX = x + branch * size * 0.75, endY = y - size * (branch === 0 ? 1 : 0.65);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + branch * size * 0.12, endY, endX, endY); ctx.stroke();
    for (let i = 1; i < 5; i++) {
      const t = i / 5, sx = x + (endX - x) * t, sy = y + (endY - y) * t;
      line(ctx, [sx - size * 0.17, sy - size * 0.14, sx, sy, sx + size * 0.15, sy - size * 0.12], color, 2);
    }
  }
}
function cloud(ctx: Context, x: number, y: number, size: number, color: string) {
  ellipse(ctx, x, y, size, size * 0.18, color);
  ellipse(ctx, x - size * 0.24, y - size * 0.11, size * 0.42, size * 0.23, color);
  ellipse(ctx, x + size * 0.25, y - size * 0.08, size * 0.35, size * 0.20, color);
}

/** Three reusable scene layers; scenery is painted only when the region changes. */
function makeLayers(region: number): HTMLCanvasElement[] {
  const p = PALETTES[region];
  const layers = Array.from({ length: 3 }, () => {
    const canvas = document.createElement("canvas"); canvas.width = WORLD.width; canvas.height = WORLD.height; return canvas;
  });
  const sky = layers[0].getContext("2d")!;
  const gradient = sky.createLinearGradient(0, 0, 0, WORLD.groundY);
  gradient.addColorStop(0, p.sky); gradient.addColorStop(1, p.horizon);
  sky.fillStyle = gradient; sky.fillRect(0, 0, WORLD.width, WORLD.height);
  const glow = sky.createRadialGradient(727, 105, 2, 727, 105, 143);
  glow.addColorStop(0, region === 2 ? "#f5dfaa33" : "#fff3bd80"); glow.addColorStop(1, "#fff3bd00");
  sky.fillStyle = glow; sky.fillRect(580, 0, 294, 255);
  ellipse(sky, 727, 105, region === 2 ? 28 : 38, region === 2 ? 28 : 38, p.sun);
  if (region === 2) {
    ellipse(sky, 715, 95, 5, 7, "#d8caaa"); ellipse(sky, 737, 112, 3, 4, "#dfcead");
    for (let i = 0; i < 49; i++) ellipse(sky, hash(i) * 960, 20 + hash(i + 50) * 195, hash(i + 80) * 1.1 + 0.6, hash(i + 80) * 1.1 + 0.6, "#faf1dcaa");
  } else {
    cloud(sky, 142, 91, 82, "#fff3d66b"); cloud(sky, 475, 53, 97, "#fff9e855"); cloud(sky, 889, 157, 89, "#fff5da55");
  }
  path(sky, [0, 255, 88, 188, 147, 209, 287, 124, 425, 242, 516, 182, 610, 232, 785, 148, 885, 229, 960, 196, 960, 415, 0, 415], p.mountainLight);
  path(sky, [0, 285, 108, 240, 156, 250, 287, 124, 279, 229, 361, 226, 425, 282, 516, 182, 507, 269, 615, 285, 785, 148, 750, 241, 833, 229, 922, 290, 960, 264, 960, 415, 0, 415], p.mountain);
  if (region === 2) {
    path(sky, [240, 172, 287, 124, 340, 170, 306, 163, 291, 150, 276, 174, 264, 166], "#d6cdd1");
    path(sky, [745, 188, 785, 148, 817, 174, 793, 168, 777, 183, 763, 178], "#d6cdd1");
  }
  // A winding ribbon of water grounds the journey in a continuous landscape.
  sky.fillStyle = p.water; sky.beginPath(); sky.moveTo(506, 289); sky.bezierCurveTo(337, 307, 680, 324, 516, 349); sky.bezierCurveTo(330, 369, 276, 381, 525, 416); sky.lineTo(736, 416); sky.bezierCurveTo(490, 372, 454, 373, 578, 350); sky.bezierCurveTo(717, 321, 394, 305, 544, 289); sky.closePath(); sky.fill();
  sky.strokeStyle = "#eef9dd44"; sky.lineWidth = 2;
  for (let i = 0; i < 12; i++) { const y = 321 + i * 7; line(sky, [445 + hash(i) * 100, y, 463 + hash(i) * 100, y], "#eef9dd44", 1.5); }
  const far = layers[1].getContext("2d")!;
  for (let i = 0; i < 21; i++) {
    const x = i * 49 + hash(i + 1) * 17; const height = 75 + hash(i + 2) * 100;
    for (const wrap of [-WORLD.width, 0, WORLD.width]) pine(far, x + wrap, 350 + hash(i + 9) * 22, height, height * 0.45, p.far, p.farLight, p.far);
  }
  far.fillStyle = p.far; far.beginPath(); far.moveTo(0, 362); far.bezierCurveTo(160, 344, 227, 371, 365, 359); far.bezierCurveTo(516, 335, 647, 380, 803, 354); far.quadraticCurveTo(904, 342, 960, 362); far.lineTo(960, 416); far.lineTo(0, 416); far.closePath(); far.fill();
  const mid = layers[2].getContext("2d")!;
  // Open stretches make the next obstacle easy to read, even on a small screen.
  for (const [x, height, width] of [[50, 355, 176], [387, 245, 112], [687, 307, 147], [905, 377, 172]]) {
    for (const wrap of [-WORLD.width, 0, WORLD.width]) {
      pine(mid, x + wrap, 399, height, width, p.leaves, p.light, p.trunk);
      ellipse(mid, x + wrap - 9, 405, width * 0.6, 10, p.leaves);
    }
  }
  for (let i = 0; i < 20; i++) {
    const x = i * 50 + hash(i + 3) * 30;
    fern(mid, x, 407 + hash(i + 7) * 3, 13 + hash(i + 2) * 18, i % 2 ? p.grass : p.light);
  }
  // A small woodland home and sign are scenery, never an obstacle.
  rounded(mid, 542, 335, 44, 36, 9); mid.fillStyle = p.trunk; mid.fill();
  path(mid, [531, 337, 564, 310, 595, 337], "#cc9a62");
  ellipse(mid, 564, 345, 7, 9, "#293f40"); line(mid, [564, 367, 564, 402], p.trunk, 5);
  return layers;
}

function tile(ctx: Context, layer: HTMLCanvasElement, offset: number) {
  const x = -Math.floor(((offset % WORLD.width) + WORLD.width) % WORLD.width);
  ctx.drawImage(layer, x, 0); ctx.drawImage(layer, x + WORLD.width, 0);
}

function drawGround(ctx: Context, p: Palette, distance: number, region: number) {
  const gy = WORLD.groundY;
  ctx.fillStyle = p.dirt; ctx.fillRect(0, gy, WORLD.width, WORLD.height - gy);
  ctx.fillStyle = p.dirtLight; ctx.fillRect(0, gy + 6, WORLD.width, 29);
  ctx.fillStyle = p.grass; ctx.fillRect(0, gy - 7, WORLD.width, 13);
  ctx.fillStyle = p.grassLight; ctx.fillRect(0, gy - 5, WORLD.width, 3);
  const offset = distance % 110;
  for (let i = -1; i < 10; i++) {
    const x = i * 110 - offset;
    path(ctx, [x, gy - 2, x + 3, gy - 13, x + 7, gy - 4, x + 14, gy - 11, x + 13, gy + 1], p.grassLight);
    line(ctx, [x + 42, gy + 27, x + 51, gy + 27], "#f9e1b24d", 2);
    ellipse(ctx, x + 88, gy + 38, 3, 2, "#654e4655");
    ellipse(ctx, x + 64, gy + 68, 3, 1.5, "#edd1ad30");
  }
  ctx.fillStyle = p.leaves; ctx.beginPath(); ctx.moveTo(0, 516);
  for (let i = 0; i <= 25; i++) ctx.lineTo(i * 40, 504 + Math.sin(i * 2.3) * 10);
  ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.closePath(); ctx.fill();
  const near = distance * 1.1 % 195;
  for (let i = -1; i < 6; i++) {
    const x = i * 195 - near;
    fern(ctx, x + 48, 532, 42, p.light);
    line(ctx, [x + 119, 514, x + 121, 503], "#e2cfab", 3);
    ellipse(ctx, x + 121, 501, 10, 6, region === 2 ? "#b98fa7" : "#d99560");
    ellipse(ctx, x + 117, 500, 2, 1.5, "#f7dbae");
    ellipse(ctx, x + 148, 529, 20, 8, p.trunk, -0.12);
  }
}
function drawLog(ctx: Context, x: number, width: number, height: number) {
  const y = WORLD.groundY - height;
  ellipse(ctx, x + width / 2, WORLD.groundY + 4, width * 0.61, 6, "#17342f35");
  rounded(ctx, x, y + 3, width, height - 3, 7); ctx.fillStyle = "#7c4d32"; ctx.fill();
  rounded(ctx, x + 3, y + 3, width - 7, Math.max(7, height * 0.34), 5); ctx.fillStyle = "#b87c49"; ctx.fill();
  line(ctx, [x + 3, y + height * 0.56, x + width * 0.4, y + height * 0.48, x + width - 6, y + height * 0.63], "#633d2d", 3);
  line(ctx, [x + width * 0.32, y + height * 0.8, x + width * 0.61, y + height * 0.7], "#dfa05d", 2);
  const rx = Math.min(12, width * 0.20);
  ellipse(ctx, x + width - rx + 1, y + height / 2, rx, height / 2 - 1, "#f0c784");
  ctx.strokeStyle = "#a76c40"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + width - rx + 1, y + height / 2, rx * 0.6, height * 0.31, 0, 0, TAU); ctx.stroke();
  ellipse(ctx, x + width - rx + 1, y + height / 2, 2, 3, "#a76c40");
  path(ctx, [x + 7, y + 6, x + 12, y - 1, x + 28, y + 1, x + 36, y + 7, x + 22, y + 9], "#8fa75c");
}
function drawRock(ctx: Context, x: number, width: number, height: number) {
  const y = WORLD.groundY - height;
  ellipse(ctx, x + width / 2, WORLD.groundY + 4, width * 0.6, 6, "#17342f35");
  path(ctx, [x, y + height, x + 3, y + height * 0.51, x + width * 0.29, y + 3, x + width * 0.60, y, x + width * 0.86, y + height * 0.3, x + width, y + height * 0.76, x + width - 3, y + height], "#536a70");
  path(ctx, [x + 3, y + height * 0.51, x + width * 0.29, y + 3, x + width * 0.60, y, x + width * 0.48, y + height * 0.59, x + width * 0.12, y + height * 0.78], "#a5bab3");
  path(ctx, [x + width * 0.60, y, x + width * 0.86, y + height * 0.3, x + width - 1, y + height * 0.76, x + width * 0.49, y + height * 0.60], "#819991");
  line(ctx, [x + width * 0.29, y + 3, x + width * 0.60, y + 1], "#d6debc", 2);
}
function drawPickup(ctx: Context, kind: "star" | "shield", x: number, y: number, time: number, reduced: boolean) {
  const bob = reduced ? 0 : Math.sin(time * 3.8 + x * 0.005) * 3;
  y += bob;
  ellipse(ctx, x, y, kind === "shield" ? 27 : 22, kind === "shield" ? 27 : 22, "#fff3b317");
  ellipse(ctx, x, y, kind === "shield" ? 22 : 18, kind === "shield" ? 22 : 18, "#fff3b325");
  if (kind === "star") {
    star(ctx, x, y + 2, 14, "#b67b2a"); star(ctx, x, y, 14, "#ffdd72", reduced ? 0 : Math.sin(time * 2) * 0.07);
    star(ctx, x - 2, y - 2, 7, "#fff1af");
  } else {
    ctx.fillStyle = "#fff0bd"; ctx.beginPath(); ctx.moveTo(x, y - 19); ctx.lineTo(x + 16, y - 12); ctx.lineTo(x + 14, y + 5); ctx.quadraticCurveTo(x + 11, y + 14, x, y + 20); ctx.quadraticCurveTo(x - 11, y + 14, x - 14, y + 5); ctx.lineTo(x - 16, y - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#56aaa3"; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 11, y - 8); ctx.lineTo(x + 9, y + 4); ctx.quadraticCurveTo(x + 7, y + 10, x, y + 14); ctx.quadraticCurveTo(x - 7, y + 10, x - 9, y + 4); ctx.lineTo(x - 11, y - 8); ctx.closePath(); ctx.fill();
    star(ctx, x, y - 1, 7, "#fff4c6");
  }
}

function drawBear(ctx: Context, hearts: number, time: number, running: boolean) {
  const x = 64 + (3 - Math.max(0, hearts)) * 12;
  const step = running ? time * 11 : 0;
  const bob = running ? Math.sin(step * 2) * 2 : 0;
  ellipse(ctx, x, WORLD.groundY + 5, 37, 6, "#17342f30");
  ctx.save(); ctx.translate(x, WORLD.groundY + bob);
  const a = Math.sin(step) * 10;
  line(ctx, [-21, -28, -22 - a, -13, -26 - a, -3], "#72553e", 14);
  line(ctx, [17, -28, 21 + a, -12, 29 + a, -3], "#7e5c40", 14);
  ellipse(ctx, -1, -38, 35, 27, "#a88155", -0.07);
  ellipse(ctx, -26, -42, 12, 11, "#b48c5c");
  line(ctx, [-18, -27, -18 + a, -12, -10 + a, -3], "#a88155", 15);
  line(ctx, [24, -30, 25 - a, -14, 31 - a, -4], "#b38a59", 15);
  ellipse(ctx, 19, -70, 11, 12, "#a88155"); ellipse(ctx, 19, -70, 6, 7, "#745841");
  ellipse(ctx, 42, -62, 10, 11, "#a88155"); ellipse(ctx, 42, -62, 5, 6, "#745841");
  ellipse(ctx, 31, -51, 24, 24, "#b89160"); ellipse(ctx, 43, -44, 15, 11, "#e0bd82");
  ellipse(ctx, 49, -48, 5, 3.5, "#3e3a31"); ellipse(ctx, 37, -57, 2.4, 3, "#333a32");
  ellipse(ctx, 38, -58, 0.8, 1, "#fff3cf");
  ctx.strokeStyle = "#725841"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(43, -43, 5, 0.1, 1.6); ctx.stroke();
  line(ctx, [17, -33, 34, -32, 41, -29], "#83bfc0", 6);
  path(ctx, [26, -32, 27, -14, 37, -18, 33, -33], "#8fcbd0");
  ctx.restore();
}

function drawBradley(ctx: Context, game: GameState, time: number, reduced: boolean, portrait: HTMLImageElement | null) {
  const running = game.phase === "playing" && game.grounded;
  const stride = running ? game.distance * PIXELS_PER_METER / 21 : 0;
  const swing = running ? Math.sin(stride) : game.grounded ? 0 : 0.85;
  const bob = running && !reduced ? Math.abs(Math.cos(stride)) * -2 : 0;
  const lift = Math.max(0, WORLD.groundY - game.y);
  ellipse(ctx, WORLD.playerX, WORLD.groundY + 5, Math.max(12, 26 - lift * 0.05), 5, "#183a3133");
  ctx.save(); ctx.translate(WORLD.playerX, game.y + bob);
  if (game.shield > 0) {
    ellipse(ctx, 0, -45, 46, 59, "#ffeea01a");
    ctx.strokeStyle = "#fff0a8a6"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -45, 45, 58, 0, 0, TAU); ctx.stroke();
    if (!reduced) { for (let i = 0; i < 3; i++) { const angle = time * 2 + i * TAU / 3; star(ctx, Math.cos(angle) * 45, -45 + Math.sin(angle) * 57, 4, "#fff2b5"); } }
  }
  ctx.scale(0.79, 0.79);
  if (game.invulnerable > 0) ctx.globalAlpha = reduced ? 0.78 : 0.65 + Math.sin(time * 18) * 0.2;
  if (game.spin > 0 && !reduced) { ctx.translate(0, -44); ctx.rotate((1 - game.spin / 0.5) * TAU); ctx.translate(0, 44); }
  // Legs have distinct knees and boots, so the runner never slides like a card.
  const rearKneeX = -5 - swing * 13, rearFootX = -7 + swing * 21;
  line(ctx, [-4, -32, rearKneeX, -19, rearFootX, -6], "#645d45", 10);
  line(ctx, [rearFootX - 2, -4, rearFootX + 8, -4], "#344744", 9);
  const frontKneeX = 5 + swing * 15, frontFootX = 6 - swing * 22;
  line(ctx, [5, -31, frontKneeX, game.grounded ? -19 : -26, frontFootX, game.grounded ? -5 : -16], "#9b9469", 11);
  line(ctx, [frontFootX - 1, game.grounded ? -3 : -14, frontFootX + 9, game.grounded ? -3 : -14], "#314843", 9);
  // Canvas satchel, navy shirt, and his red explorer scarf.
  rounded(ctx, -23, -65, 23, 32, 7); ctx.fillStyle = "#b7a46e"; ctx.fill();
  rounded(ctx, -24, -53, 9, 16, 3); ctx.fillStyle = "#d8c389"; ctx.fill();
  line(ctx, [-22, -62, -15, -61, -14, -36], "#746946", 3);
  line(ctx, [-7, -63, -17 - swing * 10, -47, -6 - swing * 10, -42], "#325c67", 9);
  path(ctx, [-8, -70, 10, -69, 16, -43, 11, -28, -13, -29, -15, -48], "#346474");
  path(ctx, [-6, -68, 0, -64, 2, -31, -12, -31, -14, -48], "#b6aa74");
  path(ctx, [8, -68, 10, -63, 15, -39, 12, -31, 5, -32, 5, -62], "#c8ba7c");
  rounded(ctx, -12, -44, 9, 9, 2); ctx.fillStyle = "#8d875f"; ctx.fill();
  line(ctx, [-12, -31, 12, -31], "#685c44", 4);
  rounded(ctx, 0, -33, 5, 4, 1); ctx.fillStyle = "#d8c28d"; ctx.fill();
  const elbow = 13 - swing * 13, hand = 22 - swing * 12;
  line(ctx, [10, -60, elbow, -46, hand, -50 + swing * 4], "#3b7080", 10);
  ellipse(ctx, hand + 2, -49 + swing * 4, 5, 5.5, "#dfaa7b");
  path(ctx, [-6, -71, -28, -67 + Math.sin(time * 11) * (running ? 3 : 0), -20, -62, -29, -58, -1, -65], "#cc7159");
  line(ctx, [-6, -71, 11, -68], "#e69a76", 6);
  ellipse(ctx, 3, -72, 7, 7, "#d99f71");
  ctx.save(); ctx.translate(4, -78); ctx.rotate(0.09);
  if (portrait?.complete && portrait.naturalWidth) {
    // Follow the illustrated hair and jaw: no rectangular photo background.
    ctx.beginPath(); ctx.moveTo(-18, -22); ctx.quadraticCurveTo(-19, -32, -8, -34); ctx.quadraticCurveTo(10, -38, 20, -26); ctx.lineTo(22, -11); ctx.quadraticCurveTo(25, -10, 23, -3); ctx.lineTo(19, 3); ctx.quadraticCurveTo(15, 14, 6, 17); ctx.quadraticCurveTo(-7, 14, -13, 3); ctx.quadraticCurveTo(-17, -3, -18, -14); ctx.closePath(); ctx.clip();
    ctx.drawImage(portrait, 126, 41, 144, 180, -20, -36, 45, 55);
  } else {
    ellipse(ctx, 2, -9, 18, 23, "#e9b68a");
    path(ctx, [-16, -10, -19, -24, -11, -34, 6, -36, 19, -28, 21, -14, 12, -25, 5, -21, 6, -29, -6, -20, -6, -27], "#4b3b2b");
    ellipse(ctx, 10, -10, 2, 2.4, "#453b30");
    ctx.strokeStyle = "#7f523d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, -2, 7, 0.2, 1.9); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

export function createForestRenderer(): (ctx: Context, game: GameState, time: number, reducedMotion: boolean, portrait: HTMLImageElement | null) => void {
  let cachedRegion = -1;
  let layers: HTMLCanvasElement[] = [];
  let previousElapsed = 0, previousStars = 0, previousHearts = 3, previousShield = 0;
  let sparks: { x: number; y: number; vx: number; vy: number; at: number; color: string }[] = [];
  return (ctx, game, time, reducedMotion, portrait) => {
    const region = Math.max(0, Math.min(2, game.region));
    if (region !== cachedRegion) { layers = makeLayers(region); cachedRegion = region; }
    const p = PALETTES[region];
    const offset = game.distance * PIXELS_PER_METER;
    const cosmeticTime = game.phase === "playing" ? game.elapsed : game.phase === "ready" ? time * 0.3 : game.elapsed;
    if (game.elapsed < previousElapsed || game.phase === "ready") sparks = [];
    if (!reducedMotion && game.elapsed >= previousElapsed && (game.stars > previousStars || game.hearts < previousHearts || game.shield > previousShield + 1)) {
      const color = game.hearts < previousHearts ? "#ebbd8b" : game.shield > previousShield + 1 ? "#c1f0d5" : "#fff1a3";
      for (let i = 0; i < 8; i++) {
        const angle = i * TAU / 8;
        sparks.push({ x: WORLD.playerX, y: game.y - 46, vx: Math.cos(angle) * 70, vy: Math.sin(angle) * 70 - 24, at: game.elapsed, color });
      }
      if (sparks.length > 32) sparks = sparks.slice(-32);
    }
    previousElapsed = game.elapsed; previousStars = game.stars; previousHearts = game.hearts; previousShield = game.shield;
    ctx.save();
    ctx.drawImage(layers[0], 0, 0);
    tile(ctx, layers[1], reducedMotion ? 0 : offset * 0.12);
    tile(ctx, layers[2], reducedMotion ? 0 : offset * 0.34);
    if (region > 0) {
      for (let i = 0; i < 13; i++) {
        const x = (hash(i + 8) * 1050 - offset * 0.12 % 1050 + 1050) % 1050;
        const y = 150 + hash(i + 40) * 230 + (reducedMotion ? 0 : Math.sin(cosmeticTime + i) * 7);
        ellipse(ctx, x, y, 4, 4, region === 1 ? "#e9f4ab12" : "#ffeabf12");
        ellipse(ctx, x, y, 1.5, 1.5, region === 1 ? "#e9f4abab" : "#ffeabfab");
      }
    }
    drawGround(ctx, p, offset, region);
    // Trail markers sit below the collision plane; every 180m is a little celebration.
    const signX = 860 - offset * 0.34 % 1400;
    if (signX > -160) {
      line(ctx, [signX, 457, signX, 502], p.trunk, 7);
      rounded(ctx, signX - 59, 454, 120, 27, 5); ctx.fillStyle = "#eed7a7"; ctx.fill();
      ctx.fillStyle = "#4e6652"; ctx.font = "700 10px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(region === 0 ? "BRADLEY’S TRAIL  →" : region === 1 ? "FIREFLY CREEK  →" : "STARLIGHT SUMMIT  →", signX, 471);
    }
    drawBear(ctx, game.hearts, cosmeticTime, game.phase === "playing" && !reducedMotion);
    for (const obstacle of game.obstacles) {
      if (obstacle.x + obstacle.w < -10 || obstacle.x > WORLD.width + 10) continue;
      if (obstacle.kind === "log") drawLog(ctx, obstacle.x, obstacle.w, obstacle.h);
      else drawRock(ctx, obstacle.x, obstacle.w, obstacle.h);
    }
    for (const pickup of game.pickups) {
      if (pickup.x < -30 || pickup.x > WORLD.width + 30) continue;
      drawPickup(ctx, pickup.kind, pickup.x, pickup.y, cosmeticTime, reducedMotion);
    }
    if (game.phase === "playing" && game.grounded && !reducedMotion) {
      for (let i = 0; i < 4; i++) {
        const t = (cosmeticTime * 2.5 + i / 4) % 1;
        ellipse(ctx, WORLD.playerX - 20 - t * 42, WORLD.groundY - 2 - Math.sin(t * Math.PI) * 9, 2 + t * 3, 1 + t * 2, `rgba(232,217,176,${(1 - t) * 0.35})`);
      }
    }
    drawBradley(ctx, game, cosmeticTime, reducedMotion, portrait);
    sparks = sparks.filter(spark => game.elapsed - spark.at < 0.55);
    if (!reducedMotion) for (const spark of sparks) {
      const age = game.elapsed - spark.at;
      ctx.globalAlpha = Math.max(0, 1 - age / 0.55);
      star(ctx, spark.x + spark.vx * age, spark.y + spark.vy * age + 50 * age * age, 3.5, spark.color, age * 2);
    }
    ctx.restore();
  };
}
