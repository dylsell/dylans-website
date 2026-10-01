import { getBallPosition, getSaveRadius, WORLD, type GameState } from "./game";

type Context = CanvasRenderingContext2D;
type Point = readonly [number, number];
const TAU = Math.PI * 2;
const FONT = '"Arial", "Helvetica Neue", sans-serif';

function polygon(ctx: Context, points: readonly Point[], fill: string, stroke?: string, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function line(ctx: Context, points: readonly Point[], color: string, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function ellipse(ctx: Context, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function text(ctx: Context, value: string, x: number, y: number, size: number, color: string, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}

function random(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function star(ctx: Context, x: number, y: number, radius: number, color: string) {
  const points: Point[] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * TAU - Math.PI / 2;
    const distance = index % 2 === 0 ? radius : radius * 0.43;
    points.push([x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]);
  }
  polygon(ctx, points, color);
}

function flag(ctx: Context, x: number, y: number, width: number, nation: "usa" | "nl") {
  const height = width * 0.6;
  ctx.fillStyle = "#fffbed";
  ctx.fillRect(x, y, width, height);
  if (nation === "usa") {
    ctx.fillStyle = "#dc4a56";
    for (let stripe = 0; stripe < 7; stripe += 1) ctx.fillRect(x, y + stripe * height / 7, width, height / 14);
    ctx.fillStyle = "#193d70";
    ctx.fillRect(x, y, width * 0.46, height * 0.55);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        ctx.fillStyle = "#fffbed";
        ctx.fillRect(x + 3 + column * width * 0.09, y + 2 + row * height * 0.15, 1.2, 1.2);
      }
    }
  } else {
    ctx.fillStyle = "#d94748";
    ctx.fillRect(x, y, width, height / 3);
    ctx.fillStyle = "#214b91";
    ctx.fillRect(x, y + height * 2 / 3, width, height / 3);
  }
}

function drawStands(ctx: Context) {
  const sky = ctx.createLinearGradient(0, 0, 0, 255);
  sky.addColorStop(0, "#75c6e4");
  sky.addColorStop(0.8, "#d1edf0");
  sky.addColorStop(1, "#f5f3d9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ellipse(ctx, 779, 52, 30, 30, "rgba(255,250,209,.65)");
  ellipse(ctx, 779, 52, 23, 23, "#fff8d4");
  for (const cloud of [[152, 58, 1], [676, 27, 0.6], [859, 95, 0.7]]) {
    ctx.save();
    ctx.translate(cloud[0], cloud[1]);
    ctx.scale(cloud[2], cloud[2]);
    ellipse(ctx, 0, 0, 44, 11, "rgba(255,255,248,.63)");
    ellipse(ctx, -17, -5, 20, 13, "rgba(255,255,248,.63)");
    ellipse(ctx, 12, -8, 24, 16, "rgba(255,255,248,.63)");
    ctx.restore();
  }

  // A low open-air bowl leaves plenty of sky for high saves.
  polygon(ctx, [[0, 129], [220, 157], [480, 169], [740, 157], [960, 129], [960, 268], [0, 268]], "#163f55");
  polygon(ctx, [[0, 125], [220, 153], [480, 165], [740, 153], [960, 125], [960, 135], [740, 163], [480, 175], [220, 163], [0, 135]], "#eef2df");
  line(ctx, [[0, 127], [220, 155], [480, 167], [740, 155], [960, 127]], "#88abb5", 2);

  const fanColors = ["#e8efe3", "#d65358", "#3c77aa", "#fff3d4", "#f69744", "#ee7135"];
  for (let row = 0; row < 7; row += 1) {
    for (let seat = 0; seat < 100; seat += 1) {
      const seed = row * 107 + seat;
      const x = seat * 9.8 + (row % 2) * 4;
      const bowl = 31 * (1 - Math.pow((x - 480) / 480, 2));
      const y = 140 + row * 12 + bowl;
      const color = fanColors[(x < 480 ? Math.floor(random(seed + 8) * 4) : 3 + Math.floor(random(seed + 8) * 3))];
      ctx.fillStyle = color;
      ctx.fillRect(x - 2.2, y + 1, 4.4, 5);
      ellipse(ctx, x, y - 0.4, 1.8, 2, seed % 3 ? "#d9ab85" : "#8f6855");
      if (seed % 13 === 0) line(ctx, [[x - 4, y - 2], [x - 2, y + 2], [x + 2, y + 2], [x + 4, y - 3]], color, 1.5);
    }
    ctx.beginPath();
    ctx.moveTo(0, 148 + row * 12);
    ctx.quadraticCurveTo(480, 210 + row * 12, 960, 148 + row * 12);
    ctx.strokeStyle = "rgba(4,32,47,.17)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const x of [106, 304, 654, 852]) {
    polygon(ctx, [[x - 2, 143], [x + 3, 144], [x + 26, 250], [x + 14, 250]], "rgba(202,213,204,.34)");
  }

  // Permanent supporter banners are cached along with the crowd.
  ctx.fillStyle = "#f9f0d8";
  ctx.fillRect(109, 215, 159, 20);
  ctx.fillStyle = "#db4c55";
  ctx.fillRect(109, 215, 159, 3);
  text(ctx, "LET’S GO BRADLEY!", 188, 227, 11, "#203e5b");
  ctx.fillStyle = "#e97b32";
  ctx.fillRect(707, 212, 149, 20);
  text(ctx, "HUP HOLLAND!", 781, 223, 11, "#fff5db");

  // A personal scoreboard at the far end of Bradley's home ground.
  line(ctx, [[389, 158], [389, 127]], "#607e81", 4);
  line(ctx, [[571, 158], [571, 127]], "#607e81", 4);
  polygon(ctx, [[361, 99], [599, 99], [599, 158], [361, 158]], "#16384e", "#efe9cf", 3);
  ctx.fillStyle = "#244c62";
  ctx.fillRect(368, 105, 224, 5);
  text(ctx, "BRADLEY’S HOME GROUND", 480, 123, 13, "#fff8dd");
  flag(ctx, 385, 134, 26, "usa");
  flag(ctx, 549, 134, 26, "nl");
  text(ctx, "USA  ×  NETHERLANDS", 480, 143, 9, "#b9d6de", 700);

  ctx.fillStyle = "#183b54";
  ctx.fillRect(0, 247, 960, 30);
  ctx.fillStyle = "#f3edd7";
  ctx.fillRect(0, 248, 960, 2);
  text(ctx, "USA", 116, 263, 16, "#faf4db");
  star(ctx, 157, 262, 6, "#f1cf73");
  text(ctx, "BRADLEY  ·  OUR NUMBER 1", 480, 263, 14, "#fff7e1");
  star(ctx, 799, 262, 6, "#f1cf73");
  text(ctx, "USA", 841, 263, 16, "#faf4db");
  ctx.fillStyle = "#ed7451";
  ctx.fillRect(0, 276, 960, 3);
}

function drawPitch(ctx: Context) {
  const turf = ctx.createLinearGradient(0, 278, 0, WORLD.height);
  turf.addColorStop(0, "#7fa959");
  turf.addColorStop(0.25, "#5d9854");
  turf.addColorStop(1, "#287356");
  ctx.fillStyle = turf;
  ctx.fillRect(0, 279, 960, 321);
  for (const [top, bottom] of [[281, 291], [305, 324], [348, 381], [423, 481], [550, 600]]) {
    ctx.fillStyle = "rgba(230,247,143,.095)";
    ctx.fillRect(0, top, 960, bottom - top);
  }

  // Lines radiate out of the distant field; the player stands on the goal line.
  line(ctx, [[339, 279], [64, 600]], "rgba(245,249,210,.72)", 3);
  line(ctx, [[621, 279], [896, 600]], "rgba(245,249,210,.72)", 3);
  line(ctx, [[206, 600], [340, 371], [620, 371], [754, 600]], "rgba(250,251,221,.78)", 3);
  line(ctx, [[271, 340], [326, 311], [634, 311], [689, 340]], "rgba(250,251,221,.62)", 2);
  ctx.beginPath();
  ctx.ellipse(480, 310, 84, 13, 0, Math.PI, TAU);
  ctx.strokeStyle = "rgba(250,251,221,.6)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 480, 335, 4, 1.8, "#ebf0cd");
  line(ctx, [[0, 551], [960, 551]], "rgba(243,248,218,.9)", 7);
  line(ctx, [[0, 557], [960, 557]], "rgba(16,63,44,.12)", 2);

  // Subtle grass texture is rasterized once, never regenerated during play.
  for (let blade = 0; blade < 440; blade += 1) {
    const x = random(blade + 51) * 960;
    const y = 284 + random(blade + 924) * 316;
    const depth = (y - 270) / 330;
    line(ctx, [[x, y], [x + 3 + depth * 4, y - depth * 1.5]], blade % 2 ? "rgba(235,242,177,.095)" : "rgba(15,72,48,.07)", 1);
  }
  // The goal casts a quiet diagonal shadow across the near turf.
  polygon(ctx, [[64, 552], [899, 552], [960, 590], [105, 590]], "rgba(14,59,53,.11)");
  polygon(ctx, [[61, 552], [89, 600], [99, 600], [70, 550]], "rgba(14,59,53,.14)");
}

function drawGoalFrame(ctx: Context) {
  // The side and roof nets live outside the playable plane, as if Bradley is
  // standing just inside the goal. There is no mesh obscuring the incoming ball.
  polygon(ctx, [[0, 0], [58, 41], [58, 551], [0, 600]], "rgba(220,233,210,.13)");
  polygon(ctx, [[960, 0], [902, 41], [902, 551], [960, 600]], "rgba(220,233,210,.13)");
  polygon(ctx, [[0, 0], [960, 0], [902, 41], [58, 41]], "rgba(223,237,226,.13)");
  for (let index = 1; index <= 7; index += 1) {
    const depth = index / 8;
    line(ctx, [[58 * depth, 41 * depth], [58 * depth, 600 - 49 * depth]], "rgba(245,249,230,.47)", 1);
    line(ctx, [[960 - 58 * depth, 41 * depth], [960 - 58 * depth, 600 - 49 * depth]], "rgba(245,249,230,.47)", 1);
    line(ctx, [[58 * depth, 41 * depth], [960 - 58 * depth, 41 * depth]], "rgba(245,249,230,.4)", 1);
  }
  for (let y = 0; y < 625; y += 37) {
    line(ctx, [[0, y], [58, 41 + y * 0.85]], "rgba(245,249,230,.6)", 1);
    line(ctx, [[960, y], [902, 41 + y * 0.85]], "rgba(245,249,230,.6)", 1);
  }
  for (let x = 0; x <= 960; x += 42) line(ctx, [[x, 0], [58 + x * 0.88, 41]], "rgba(245,249,230,.48)", 1);
  line(ctx, [[59, 550], [59, 42], [901, 42], [901, 550]], "rgba(16,57,72,.18)", 17);
  line(ctx, [[58, 549], [58, 40], [902, 40], [902, 549]], "#d6e3db", 12);
  line(ctx, [[56, 546], [56, 38], [902, 38]], "#fffdf0", 6);
  line(ctx, [[900, 43], [900, 546]], "#fffdf0", 6);
  ellipse(ctx, 59, 551, 12, 4, "#d2ddc8");
  ellipse(ctx, 901, 551, 12, 4, "#d2ddc8");
}

function drawKicker(ctx: Context, game: GameState, reducedMotion: boolean) {
  const winding = game.stage === "windup" && game.phase === "playing";
  const preparation = winding ? Math.min(1, game.elapsed / game.windupDuration) : 1;
  const run = winding && !reducedMotion ? Math.sin(preparation * Math.PI * 5) : 0;
  const kick = game.stage === "flight" ? Math.max(0, 1 - game.elapsed / 0.4) : 0;
  const runBack = winding ? (1 - preparation) * 20 : 0;
  const x = 480 - runBack * 0.8;
  const y = 331 - runBack * 0.3;
  ellipse(ctx, x + 4, y + 6, 25, 5, "rgba(17,61,41,.26)");
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(kick * -0.1);
  ctx.lineCap = "round";
  // Socks and boots have a distinct silhouette even on a small tablet.
  line(ctx, [[-9, -31], [-12 - run * 3, -13], [-12 - run * 3, 0]], "#d69871", 8);
  line(ctx, [[8, -31], [12 + run * 5, -15 - kick * 13], [9 + kick * 27, 1 - kick * 20]], "#d69871", 8);
  line(ctx, [[-12 - run * 3, -14], [-12 - run * 3, -1]], "#f4772c", 8);
  line(ctx, [[12 + run * 5, -15 - kick * 13], [9 + kick * 27, 1 - kick * 20]], "#f4772c", 8);
  line(ctx, [[-17 - run * 3, 3], [-7 - run * 3, 3]], "#172c38", 6);
  line(ctx, [[7 + kick * 26, 4 - kick * 20], [16 + kick * 26, 3 - kick * 20]], "#172c38", 6);
  line(ctx, [[-17 - run * 3, 4], [-8 - run * 3, 4]], "#d5e1d5", 1.5);
  line(ctx, [[7 + kick * 26, 5 - kick * 20], [16 + kick * 26, 4 - kick * 20]], "#d5e1d5", 1.5);
  polygon(ctx, [[-16, -43], [16, -43], [17, -25], [3, -24], [0, -32], [-3, -24], [-17, -26]], "#233b45");
  line(ctx, [[-19, -64], [-28 - run * 2, -48], [-29 - run * 3 - kick * 8, -39]], "#d99b76", 7);
  line(ctx, [[19, -64], [28 + run * 2, -50], [33 + run * 3 + kick * 6, -44]], "#d99b76", 7);
  polygon(ctx, [[-9, -73], [-21, -67], [-25, -54], [-15, -51], [-15, -40], [16, -40], [15, -51], [25, -54], [21, -67], [9, -73]], "#ff842d", "#d65d26", 1);
  line(ctx, [[-8, -71], [0, -66], [8, -71]], "#173a46", 2);
  line(ctx, [[-14, -43], [14, -43]], "#f4b25f", 1.2);
  text(ctx, "9", 0, -53, 17, "#243943", 900);
  ellipse(ctx, 0, -79, 9.5, 11, "#dda57e");
  ellipse(ctx, -9, -79, 2, 3, "#dda57e");
  ellipse(ctx, 9, -79, 2, 3, "#dda57e");
  polygon(ctx, [[-10, -82], [-8, -90], [-2, -93], [7, -91], [11, -85], [7, -84], [3, -88], [-5, -86], [-8, -79]], "#48352d");
  line(ctx, [[-4, -79], [-2, -79]], "#493c35", 1.1);
  line(ctx, [[3, -79], [5, -79]], "#493c35", 1.1);
  line(ctx, [[-2, -73], [3, -73]], "#ab7158", 1);
  ctx.restore();
}

function drawBall(ctx: Context, x: number, y: number, radius: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ellipse(ctx, 1.5, 2.5, radius + 0.6, radius + 0.6, "rgba(13,37,43,.21)");
  ellipse(ctx, 0, 0, radius, radius, "#fffbed");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.clip();
  const vertices: Point[] = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = i * TAU / 5 - Math.PI / 2;
    vertices.push([Math.cos(angle) * radius * 0.39, Math.sin(angle) * radius * 0.39]);
  }
  polygon(ctx, vertices, "#203747");
  for (let i = 0; i < 5; i += 1) {
    const angle = i * TAU / 5 - Math.PI / 2;
    const a = vertices[i];
    const px = Math.cos(angle) * radius * 0.86;
    const py = Math.sin(angle) * radius * 0.86;
    line(ctx, [a, [px, py]], "#647572", Math.max(0.6, radius * 0.025));
    const patch: Point[] = [];
    for (let corner = 0; corner < 5; corner += 1) {
      const patchAngle = angle + corner * TAU / 5;
      patch.push([Math.cos(angle) * radius * 1.05 + Math.cos(patchAngle) * radius * 0.34, Math.sin(angle) * radius * 1.05 + Math.sin(patchAngle) * radius * 0.34]);
    }
    polygon(ctx, patch, "#203747");
  }
  ellipse(ctx, -radius * 0.25, -radius * 0.37, radius * 0.23, radius * 0.12, "rgba(255,255,255,.38)");
  ctx.restore();
}

function drawCue(ctx: Context, game: GameState, time: number, reducedMotion: boolean) {
  if (game.phase !== "playing" || game.stage === "result" || game.difficulty !== "rookie") return;
  const firstShot = game.shotIndex === 0;
  const progress = getBallPosition(game).progress;
  if (!firstShot && (game.stage !== "flight" || progress < 0.16)) return;
  const pulse = reducedMotion ? 0 : Math.sin(time * 5) * 2;
  ctx.save();
  ctx.globalAlpha = firstShot ? 0.8 : 0.48;
  ellipse(ctx, game.targetX, game.targetY, 24 + pulse, 24 + pulse, "rgba(238,255,213,.14)");
  ctx.beginPath();
  ctx.arc(game.targetX, game.targetY, 24 + pulse, 0, TAU);
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#f9ffdc";
  ctx.lineWidth = firstShot ? 2.5 : 1.8;
  ctx.stroke();
  ctx.setLineDash([]);
  ellipse(ctx, game.targetX, game.targetY, 3, 3, "#fbffdf");
  ctx.restore();
}

function drawGlove(ctx: Context, x: number, y: number, side: number, closed: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side, 1);
  ctx.rotate(-0.17 + closed * 0.08);
  // Blue cuffs, cream padded fingers and a thumb facing the catch point.
  polygon(ctx, [[-19, 13], [14, 16], [26, 69], [-12, 75]], "#174878", "#10324e", 2);
  polygon(ctx, [[-18, 16], [15, 18], [18, 35], [-15, 34]], "#ecf3e8", "#143b5a", 1.5);
  polygon(ctx, [[-17, 21], [16, 23], [17, 29], [-16, 28]], "#e74d59");
  ctx.beginPath();
  ctx.moveTo(-16, 15);
  ctx.quadraticCurveTo(-26, 4, -24, -14);
  ctx.lineTo(-22, -36 + closed * 8);
  ctx.quadraticCurveTo(-20, -44 + closed * 8, -15, -39 + closed * 8);
  ctx.lineTo(-12, -16);
  ctx.lineTo(-12, -43 + closed * 10);
  ctx.quadraticCurveTo(-9, -50 + closed * 10, -5, -44 + closed * 10);
  ctx.lineTo(-3, -17);
  ctx.lineTo(-1, -45 + closed * 12);
  ctx.quadraticCurveTo(3, -50 + closed * 12, 7, -43 + closed * 12);
  ctx.lineTo(7, -16);
  ctx.lineTo(10, -36 + closed * 10);
  ctx.quadraticCurveTo(14, -42 + closed * 10, 18, -35 + closed * 10);
  ctx.lineTo(18, -6);
  ctx.lineTo(28, -18 + closed * 6);
  ctx.quadraticCurveTo(35, -21 + closed * 6, 34, -12 + closed * 6);
  ctx.lineTo(24, 8);
  ctx.quadraticCurveTo(20, 18, 10, 19);
  ctx.closePath();
  ctx.fillStyle = "#fff9df";
  ctx.fill();
  ctx.strokeStyle = "#19415a";
  ctx.lineWidth = 2;
  ctx.stroke();
  polygon(ctx, [[-19, -9], [13, -10], [21, 4], [12, 13], [-13, 10]], "#2d71a9");
  line(ctx, [[-14, -3], [10, -3]], "#a8d4dc", 2);
  line(ctx, [[-13, 2], [13, 2]], "#a8d4dc", 2);
  star(ctx, 0, 5, 4, "#fff9df");
  for (const fx of [-18, -8, 3, 13]) line(ctx, [[fx, -20], [fx + 1, -14]], "#9fb7ae", 1.4);
  ctx.restore();
}

function drawKeeper(ctx: Context, game: GameState) {
  const saved = game.stage === "result" && game.lastResult === "save";
  const close = saved ? 1 : 0;
  const radius = getSaveRadius(game);
  ctx.save();
  ctx.beginPath();
  ctx.arc(game.keeperX, game.keeperY, radius, 0, TAU);
  ctx.fillStyle = saved ? "rgba(195,245,160,.18)" : "rgba(235,252,231,.035)";
  ctx.fill();
  ctx.strokeStyle = saved ? "rgba(242,255,204,.85)" : "rgba(242,255,224,.35)";
  ctx.lineWidth = saved ? 3 : 1.5;
  ctx.stroke();
  const spread = saved ? 28 : 36;
  drawGlove(ctx, game.keeperX - spread, game.keeperY + 4, 1, close);
  drawGlove(ctx, game.keeperX + spread, game.keeperY + 4, -1, close);
  if (!saved) {
    ellipse(ctx, game.keeperX, game.keeperY, 3.5, 3.5, "#fffce6");
    line(ctx, [[game.keeperX - 9, game.keeperY], [game.keeperX - 5, game.keeperY]], "rgba(255,255,230,.75)", 1.5);
    line(ctx, [[game.keeperX + 5, game.keeperY], [game.keeperX + 9, game.keeperY]], "rgba(255,255,230,.75)", 1.5);
  }
  ctx.restore();
}

function drawSaveBurst(ctx: Context, game: GameState, reducedMotion: boolean) {
  if (game.stage !== "result" || game.lastResult !== "save") return;
  const progress = Math.min(1, game.elapsed / Math.min(0.65, game.resultDuration));
  const opacity = reducedMotion ? 0.65 : 1 - progress;
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let index = 0; index < 10; index += 1) {
    const angle = index * TAU / 10;
    const distance = getSaveRadius(game) + 10 + (reducedMotion ? 0 : progress * 45);
    const x = game.keeperX + Math.cos(angle) * distance;
    const y = game.keeperY + Math.sin(angle) * distance;
    if (index % 2 === 0) star(ctx, x, y, 5, "#fff0a4");
    else line(ctx, [[x, y], [x + Math.cos(angle) * 7, y + Math.sin(angle) * 7]], "#e7ffd9", 3);
  }
  ctx.restore();
}

/** One static raster per mounted game keeps Kindle frame work small and steady. */
export function createStadiumRenderer() {
  let background: HTMLCanvasElement | null = null;
  return (ctx: Context, game: GameState, time: number, reducedMotion: boolean): void => {
    if (!background) {
      background = document.createElement("canvas");
      background.width = WORLD.width * 1.5;
      background.height = WORLD.height * 1.5;
      const cached = background.getContext("2d");
      if (cached) {
        cached.scale(1.5, 1.5);
        cached.lineJoin = "round";
        cached.lineCap = "round";
        drawStands(cached);
        drawPitch(cached);
        drawGoalFrame(cached);
      }
    }
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.drawImage(background, 0, 0, WORLD.width, WORLD.height);
    drawKicker(ctx, game, reducedMotion);
    drawCue(ctx, game, time, reducedMotion);
    const ball = getBallPosition(game);
    const caught = game.stage === "result" && game.lastResult === "save";
    const missed = game.stage === "result" && game.lastResult === "goal";
    const ballX = caught ? game.keeperX : ball.x;
    const ballY = caught ? game.keeperY : ball.y;
    const rotation = reducedMotion ? 0 : ball.progress * 5;
    if (!caught) {
      const shadowY = Math.max(ball.y + 8, 338 + ball.progress * 213);
      ellipse(ctx, ball.x + 3, shadowY, 10 + ball.progress * 22, 3 + ball.progress * 4, "rgba(13,51,34,.18)");
    }
    if (ball.progress < 0.8) drawBall(ctx, ballX, ballY, 9 * ball.scale, rotation);
    drawKeeper(ctx, game);
    if (ball.progress >= 0.8) {
      ctx.save();
      if (missed) ctx.globalAlpha = Math.max(0.18, 1 - game.elapsed / game.resultDuration);
      drawBall(ctx, ballX, ballY, 9 * ball.scale, rotation);
      ctx.restore();
    }
    drawSaveBurst(ctx, game, reducedMotion);
    ctx.restore();
  };
}
