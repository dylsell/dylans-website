import { ArenaFrame, ROUNDS, WORLD } from "./types";

type Context = CanvasRenderingContext2D;

let cachedArena: HTMLCanvasElement | null = null;
let cachedRound = -1;

const ice = { left: 58, right: 1042, top: 257 };
const font = '"Arial", "Helvetica Neue", sans-serif';

function random(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function ellipse(ctx: Context, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function path(ctx: Context, points: number[][], fill: string | CanvasGradient, stroke?: string, width = 1) {
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

function line(ctx: Context, points: number[][], color: string, width: number) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function label(ctx: Context, text: string, x: number, y: number, size: number, color: string, weight = 800) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function bolt(ctx: Context, x: number, y: number, scale: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  path(ctx, [[9, -29], [-20, 5], [-3, 5], [-12, 30], [23, -10], [5, -10]], color);
  ctx.restore();
}

function rinkOutline(ctx: Context) {
  ctx.beginPath();
  ctx.moveTo(118, ice.top);
  ctx.bezierCurveTo(77, ice.top, 51, 293, 45, 338);
  ctx.lineTo(-33, 760);
  ctx.lineTo(1133, 760);
  ctx.lineTo(1055, 338);
  ctx.bezierCurveTo(1049, 293, 1023, ice.top, 982, ice.top);
  ctx.closePath();
}

function drawStadium(ctx: Context, round: number) {
  const accent = ROUNDS[round]?.color ?? ROUNDS[0].color;
  const background = ctx.createLinearGradient(0, 0, 0, 340);
  background.addColorStop(0, "#020817");
  background.addColorStop(0.5, "#0a203d");
  background.addColorStop(1, "#25465f");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // Roof trusses and four tiers of individually drawn supporters.
  ctx.save();
  ctx.strokeStyle = "#18304a";
  ctx.lineWidth = 3;
  for (let tier = 0; tier < 4; tier += 1) {
    const baseline = 72 + tier * 29;
    ctx.beginPath();
    ctx.moveTo(0, baseline - 27);
    ctx.quadraticCurveTo(550, baseline + 42, 1100, baseline - 27);
    ctx.stroke();
    for (let seat = 0; seat < 105; seat += 1) {
      const seed = tier * 113 + seat;
      const x = seat * 10.8 + random(seed + 31) * 5;
      const arc = 19 * (1 - Math.pow((x - 550) / 550, 2));
      const y = baseline + arc - random(seed + 9) * 9;
      const tone = random(seed + 73);
      const shirt = tone > 0.85 ? "#bbd7e4" : tone > 0.4 ? "#2368b0" : "#1b3c62";
      ctx.fillStyle = shirt;
      ctx.fillRect(x - 3, y, 6, 7 + random(seed) * 3);
      ellipse(ctx, x, y - 2.7, 2.6, 2.8, tone > 0.7 ? "#c79e86" : "#7993a1");
      if (tone > 0.78) {
        line(ctx, [[x - 3, y + 2], [x - 6, y - 5]], shirt, 2);
        line(ctx, [[x + 3, y + 2], [x + 6, y - 5]], shirt, 2);
      }
    }
  }
  for (let x = -80; x < 1200; x += 185) {
    line(ctx, [[x, 0], [x + 170, 97]], "rgba(100,145,179,.16)", 3);
    line(ctx, [[x + 170, 0], [x, 97]], "rgba(100,145,179,.10)", 2);
  }
  ctx.restore();

  // Arena ribbon, glass, and bright rink boards.
  const ribbon = ctx.createLinearGradient(0, 176, 0, 209);
  ribbon.addColorStop(0, "#1268b3");
  ribbon.addColorStop(0.6, "#083b79");
  ribbon.addColorStop(1, "#001e4f");
  ctx.fillStyle = ribbon;
  ctx.fillRect(0, 179, 1100, 31);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 179, 1100, 2);
  ctx.fillRect(0, 208, 1100, 1);
  label(ctx, "LET’S GO BRADLEY", 151, 196, 14, "#effaff");
  label(ctx, "★  HOME OF THE BOLTS  ★", 550, 196, 12, "#a6dbff");
  label(ctx, "LET’S GO BRADLEY", 950, 196, 14, "#effaff");
  for (let x = 0; x < 1100; x += 5) {
    ctx.fillStyle = "rgba(0,10,40,.16)";
    ctx.fillRect(x, 182, 1, 24);
  }
  ctx.fillStyle = "rgba(133,191,215,.13)";
  ctx.fillRect(36, 212, 1028, 59);
  for (let x = 43; x < 1080; x += 91) {
    line(ctx, [[x, 212], [x - 5, 277]], "rgba(205,240,255,.20)", 2);
    line(ctx, [[x + 3, 216], [x + 26, 251]], "rgba(240,250,255,.07)", 2);
  }
  path(ctx, [[33, 260], [1067, 260], [1077, 325], [1032, 291], [68, 291], [23, 325]], "#dfeef3");
  line(ctx, [[35, 261], [1065, 261]], "#f7fcff", 5);
  line(ctx, [[25, 317], [69, 287], [1031, 287], [1075, 317]], "#edc44d", 8);
  label(ctx, "BRADLEY", 200, 276, 20, "#064884");
  bolt(ctx, 309, 277, 0.36, "#135cad");
  label(ctx, "GO BOLTS", 839, 276, 20, "#064884");
  label(ctx, "SELLBERG", 984, 276, 11, "#437184");
  label(ctx, "★", 92, 276, 17, "#dfa935");

  // Central suspended videoboard: a personal home arena.
  line(ctx, [[414, 0], [430, 43]], "#314965", 3);
  line(ctx, [[686, 0], [670, 43]], "#314965", 3);
  ctx.save();
  ctx.shadowColor = "#2a91ee";
  ctx.shadowBlur = 30;
  path(ctx, [[380, 42], [720, 42], [708, 135], [392, 135]], "#07172d", "#41617c", 2);
  ctx.restore();
  const screen = ctx.createLinearGradient(0, 47, 0, 127);
  screen.addColorStop(0, "#123759");
  screen.addColorStop(1, "#092347");
  path(ctx, [[390, 49], [710, 49], [700, 126], [400, 126]], screen);
  for (let row = 51; row < 126; row += 4) {
    line(ctx, [[400, row], [700, row]], "rgba(95,166,255,.04)", 1);
  }
  label(ctx, ROUNDS[round]?.arena ?? "TAMPA BAY", 550, 66, 11, accent);
  label(ctx, "BRADLEY’S ARENA", 550, 92, 25, "#eefbff");
  label(ctx, "OUR CAPTAIN. OUR ALL-STAR.", 550, 116, 9, "#b4d8ef", 600);
  bolt(ctx, 364, 83, 0.48, accent);
  bolt(ctx, 736, 83, 0.48, accent);

  // Light banks remain visible even when reduced motion is enabled.
  for (const x of [110, 289, 811, 990]) {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#bfeaff";
    for (let bulb = 0; bulb < 5; bulb += 1) {
      ctx.fillStyle = "#eafaff";
      ctx.fillRect(x + bulb * 9, 24, 6, 3);
    }
    ctx.restore();
  }
}

function drawIce(ctx: Context) {
  ctx.save();
  rinkOutline(ctx);
  ctx.clip();
  const surface = ctx.createLinearGradient(0, 255, 0, 760);
  surface.addColorStop(0, "#b8dce8");
  surface.addColorStop(0.35, "#e0f4f8");
  surface.addColorStop(0.7, "#d6edf2");
  surface.addColorStop(1, "#9cc8db");
  ctx.fillStyle = surface;
  ctx.fillRect(0, 254, 1100, 506);

  const shine = ctx.createRadialGradient(550, 392, 15, 550, 392, 540);
  shine.addColorStop(0, "rgba(255,255,255,.54)");
  shine.addColorStop(1, "rgba(106,170,206,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 257, 1100, 503);

  // Perspective rink markings and the goal crease.
  ellipse(ctx, 550, 340, 189, 62, "rgba(35,151,207,.18)");
  ctx.beginPath();
  ctx.ellipse(550, 340, 189, 62, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(204,60,81,.58)";
  ctx.lineWidth = 3;
  ctx.stroke();
  line(ctx, [[30, 340], [1070, 340]], "rgba(202,55,78,.48)", 3);
  line(ctx, [[20, 489], [1080, 489]], "rgba(46,99,163,.38)", 9);
  line(ctx, [[0, 493], [1100, 493]], "rgba(255,255,255,.24)", 2);
  for (const x of [240, 860]) {
    ctx.beginPath();
    ctx.ellipse(x, 416, 135, 47, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(197,60,80,.34)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ellipse(ctx, x, 416, 7, 3.5, "rgba(197,60,80,.4)");
    line(ctx, [[x - 15, 408], [x - 15, 424]], "rgba(197,60,80,.3)", 2);
    line(ctx, [[x + 15, 408], [x + 15, 424]], "rgba(197,60,80,.3)", 2);
  }
  ctx.beginPath();
  ctx.ellipse(550, 738, 205, 82, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(35,98,161,.27)";
  ctx.lineWidth = 5;
  ctx.stroke();
  line(ctx, [[0, 738], [1100, 738]], "rgba(198,63,87,.25)", 6);
  ctx.save();
  ctx.translate(550, 737);
  ctx.scale(1, 0.43);
  bolt(ctx, 0, 0, 2.1, "rgba(22,84,153,.17)");
  ctx.restore();

  // Etched skate marks are generated once and cached with the rink.
  for (let index = 0; index < 175; index += 1) {
    const x = random(index + 401) * 1100;
    const y = 294 + random(index + 510) * 480;
    const length = 15 + random(index + 640) * 85;
    const tilt = (random(index + 818) - 0.5) * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + length * 0.5, y - tilt, x + length, y + tilt * 0.3);
    ctx.strokeStyle = index % 4 === 0 ? "rgba(62,123,151,.09)" : "rgba(255,255,255,.24)";
    ctx.lineWidth = index % 3 === 0 ? 1.4 : 0.7;
    ctx.stroke();
  }
  const foreground = ctx.createLinearGradient(0, 658, 0, 760);
  foreground.addColorStop(0, "rgba(2,25,57,0)");
  foreground.addColorStop(1, "rgba(3,30,59,.20)");
  ctx.fillStyle = foreground;
  ctx.fillRect(0, 658, 1100, 102);
  ctx.restore();

  // Near-side dasher boards frame the ice like a camera inside the rink.
  path(ctx, [[0, 255], [33, 271], [55, 330], [0, 624]], "#14314b");
  path(ctx, [[1100, 255], [1067, 271], [1045, 330], [1100, 624]], "#14314b");
  line(ctx, [[0, 260], [33, 277], [50, 330], [0, 626]], "#8bc0d5", 3);
  line(ctx, [[1100, 260], [1067, 277], [1050, 330], [1100, 626]], "#8bc0d5", 3);
}

function drawNet(ctx: Context) {
  ellipse(ctx, 550, 348, 178, 19, "rgba(5,53,81,.18)");
  // Back frame is inset, so the target plane remains exactly the hit box.
  path(ctx, [[390, 210], [418, 185], [682, 185], [710, 210], [710, 340], [686, 321], [414, 321], [390, 340]], "rgba(227,246,250,.38)");
  path(ctx, [[418, 185], [682, 185], [686, 321], [414, 321]], "rgba(50,99,121,.20)");
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(390, 210);
  ctx.lineTo(418, 185);
  ctx.lineTo(682, 185);
  ctx.lineTo(710, 210);
  ctx.lineTo(710, 340);
  ctx.lineTo(390, 340);
  ctx.closePath();
  ctx.clip();
  for (let x = 371; x < 730; x += 14) {
    line(ctx, [[x, 182], [x - 7, 341]], "rgba(251,254,255,.49)", 1);
  }
  for (let y = 186; y < 342; y += 12) {
    line(ctx, [[388, y], [713, y]], "rgba(251,254,255,.52)", 1);
  }
  for (let x = 406; x <= 698; x += 16) {
    line(ctx, [[x, 185], [x, 210]], "rgba(252,255,255,.48)", 1);
  }
  ctx.restore();
  line(ctx, [[418, 186], [682, 186]], "#b54a52", 4);
  line(ctx, [[415, 321], [685, 321]], "#f3fcff", 3);
  line(ctx, [[390, 340], [390, 210], [710, 210], [710, 340]], "rgba(72,30,46,.16)", 13);
  line(ctx, [[390, 340], [390, 210], [710, 210], [710, 340]], "#d62d45", 8);
  line(ctx, [[388, 336], [388, 209], [710, 208]], "#ff8490", 2);
  line(ctx, [[708, 215], [708, 336]], "#ff8490", 2);
  ellipse(ctx, 390, 341, 8, 3, "#a42c43");
  ellipse(ctx, 710, 341, 8, 3, "#a42c43");
}

function getBackground(round: number) {
  if (!cachedArena || cachedRound !== round) {
    cachedArena = document.createElement("canvas");
    cachedArena.width = WORLD.width * 2;
    cachedArena.height = WORLD.height * 2;
    const ctx = cachedArena.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      drawStadium(ctx, round);
      drawIce(ctx);
      drawNet(ctx);
    }
    cachedRound = round;
  }
  return cachedArena;
}

function drawLights(ctx: Context, frame: ArenaFrame) {
  const drift = frame.reducedMotion ? 0 : Math.sin(frame.time * 0.32) * 60;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const side of [-1, 1]) {
    const start = side === -1 ? 130 : 970;
    const end = 550 + side * 150 + side * drift;
    const beam = ctx.createLinearGradient(start, 30, end, 510);
    beam.addColorStop(0, "rgba(175,221,255,.13)");
    beam.addColorStop(0.5, "rgba(170,227,255,.045)");
    beam.addColorStop(1, "rgba(170,227,255,0)");
    ctx.beginPath();
    ctx.moveTo(start - 5, 29);
    ctx.lineTo(end - 145, 550);
    ctx.lineTo(end + 145, 550);
    ctx.lineTo(start + 5, 29);
    ctx.closePath();
    ctx.fillStyle = beam;
    ctx.fill();
  }
  ctx.restore();
}

function drawGoalie(ctx: Context, frame: ArenaFrame) {
  const lean = Math.max(-1, Math.min(1, frame.goalieLean));
  const bob = frame.reducedMotion ? 0 : Math.sin(frame.time * 3.4) * 1.8;
  const x = frame.goalieX;
  const y = 291 + bob;
  ellipse(ctx, x, 345, 68, 10, "rgba(12,54,75,.19)");
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean * 0.04);
  // Two substantial quilted goalie pads and their steel skate blades.
  line(ctx, [[-28, 15], [-38, 48], [-22, 53]], "#13283f", 18);
  line(ctx, [[26, 15], [37, 47], [23, 53]], "#13283f", 18);
  path(ctx, [[-42, 7], [-17, 10], [-12, 52], [-46, 52]], "#eef6f4", "#8ba8b9", 1.5);
  path(ctx, [[17, 10], [42, 7], [46, 52], [12, 52]], "#eef6f4", "#8ba8b9", 1.5);
  path(ctx, [[-41, 18], [-19, 20], [-17, 30], [-43, 29]], "#14394f");
  path(ctx, [[19, 20], [41, 18], [43, 29], [17, 30]], "#14394f");
  line(ctx, [[-44, 42], [-15, 42]], "#aec0c7", 2);
  line(ctx, [[15, 42], [44, 42]], "#aec0c7", 2);
  line(ctx, [[-50, 55], [-15, 55]], "#567482", 2);
  line(ctx, [[15, 55], [50, 55]], "#567482", 2);
  // Broad shoulders and arms define a readable silhouette behind the reticle.
  path(ctx, [[-20, -41], [-38, -32], [-51, -3], [-34, 7], [-24, -6], [-26, 21], [28, 21], [24, -7], [35, 7], [53, -4], [37, -34], [18, -41]], "#c64250", "#7d3043", 1.5);
  path(ctx, [[-24, -7], [25, -7], [27, 12], [-26, 12]], "#faf2e8");
  path(ctx, [[-27, 13], [28, 13], [28, 21], [-26, 21]], "#20374c");
  line(ctx, [[-39, -21], [-47, -5]], "#f3ece3", 7);
  line(ctx, [[39, -21], [47, -5]], "#f3ece3", 7);
  label(ctx, "G", 0, -20, 18, "#fff9ed");
  // Catching glove, blocker, and goalie stick.
  ellipse(ctx, -54, -3, 15, 19, "#e9e5d9");
  ellipse(ctx, -55, -5, 10, 13, "#b4b4a8");
  line(ctx, [[-62, -13], [-48, 6]], "#eff5ed", 2);
  path(ctx, [[44, -18], [62, -15], [66, 10], [47, 13]], "#f2f3e9", "#91a6aa", 2);
  line(ctx, [[58, 3], [59, 48], [12, 51]], "#394451", 5);
  line(ctx, [[59, 43], [59, 50], [13, 53]], "#eff4ed", 3);
  // Hockey mask with a visible wire cage.
  ellipse(ctx, 0, -49, 18, 21, "#e9f2f1");
  path(ctx, [[-14, -55], [14, -55], [12, -35], [0, -29], [-12, -35]], "#2a4356", "#bcd2d8", 2);
  line(ctx, [[-12, -49], [12, -49]], "#cadde0", 1.5);
  line(ctx, [[-12, -42], [12, -42]], "#cadde0", 1.5);
  for (const dx of [-6, 0, 6]) line(ctx, [[dx, -54], [dx, -34]], "#cadde0", 1.2);
  line(ctx, [[-7, -64], [7, -64]], "#c64250", 4);
  ctx.restore();
}

function drawPlayer(ctx: Context, frame: ArenaFrame) {
  const x = frame.playerX;
  const charge = frame.charge;
  const motion = frame.reducedMotion ? 0 : Math.sin(frame.time * 2.4) * 1.1;
  const followThrough = frame.flight ? Math.sin(Math.min(1, frame.flight.progress * 2) * Math.PI) : 0;
  ellipse(ctx, x + 3, 693, 92, 15, "rgba(12,64,90,.21)");
  // Soft, compressed reflection on the polished ice.
  ctx.save();
  ctx.globalAlpha = 0.065;
  path(ctx, [[x - 29, 697], [x + 36, 697], [x + 58, 742], [x - 45, 742]], "#0641a0");
  ctx.restore();

  ctx.save();
  ctx.translate(x, 609 + motion);
  ctx.rotate(-charge * 0.035 + followThrough * 0.06);
  // Far arm and stick appear behind the torso, with a taped blade at the puck.
  line(ctx, [[30, -31], [59, -6], [55, 10]], "#063575", 23);
  line(ctx, [[54, 5], [80, 56], [97, 64], [64, 68]], "#173747", 7);
  line(ctx, [[80, 56], [97, 64], [64, 68]], "#d8e6e7", 5);
  line(ctx, [[56, 8], [78, 51]], "#87a7a9", 1.5);

  // Athletic stance, stitched pants, socks, and detailed skate boots.
  path(ctx, [[-31, 8], [32, 8], [37, 40], [10, 44], [-2, 29], [-12, 47], [-39, 39]], "#082a5b", "#061b3a", 2);
  line(ctx, [[-2, 15], [-2, 31]], "#214c7d", 2);
  path(ctx, [[-37, 36], [-12, 43], [-19, 67], [-46, 60]], "#f2f8f7", "#9ab8c7", 1);
  path(ctx, [[12, 39], [37, 35], [45, 59], [20, 66]], "#f2f8f7", "#9ab8c7", 1);
  path(ctx, [[-40, 43], [-14, 49], [-16, 57], [-43, 50]], "#0a58b7");
  path(ctx, [[16, 47], [40, 43], [42, 51], [18, 56]], "#0a58b7");
  path(ctx, [[-45, 57], [-19, 64], [-19, 77], [-61, 77], [-63, 72]], "#122c42", "#486678", 1.5);
  path(ctx, [[20, 62], [44, 57], [51, 70], [64, 74], [61, 79], [20, 77]], "#122c42", "#486678", 1.5);
  line(ctx, [[-61, 83], [-20, 83]], "#45677d", 2.4);
  line(ctx, [[22, 83], [63, 83]], "#45677d", 2.4);
  line(ctx, [[-52, 77], [-52, 83], [-27, 83], [-27, 78]], "#e4f7fa", 2);
  line(ctx, [[28, 78], [28, 83], [55, 83], [55, 78]], "#e4f7fa", 2);
  for (let lace = 0; lace < 3; lace += 1) {
    line(ctx, [[-40 + lace * 5, 68], [-37 + lace * 5, 73]], "#b7cfdc", 1.4);
    line(ctx, [[27 + lace * 5, 68], [30 + lace * 5, 73]], "#b7cfdc", 1.4);
  }

  const jersey = ctx.createLinearGradient(-35, -58, 30, 15);
  jersey.addColorStop(0, "#1575ce");
  jersey.addColorStop(0.45, "#0757b2");
  jersey.addColorStop(1, "#06317c");
  ctx.beginPath();
  ctx.moveTo(-17, -64);
  ctx.quadraticCurveTo(-35, -64, -47, -42);
  ctx.lineTo(-41, -10);
  ctx.lineTo(-31, -17);
  ctx.lineTo(-35, 15);
  ctx.quadraticCurveTo(0, 25, 36, 14);
  ctx.lineTo(29, -18);
  ctx.lineTo(42, -14);
  ctx.lineTo(45, -42);
  ctx.quadraticCurveTo(34, -60, 18, -63);
  ctx.closePath();
  ctx.fillStyle = jersey;
  ctx.fill();
  ctx.strokeStyle = "#05387d";
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, [[-32, 6], [1, 11], [33, 5]], "#e3f3fc", 7);
  line(ctx, [[-42, -24], [-38, -11]], "#e3f3fc", 8);
  line(ctx, [[35, -27], [37, -15]], "#e3f3fc", 7);
  line(ctx, [[-26, -47], [-30, -1]], "rgba(90,181,249,.24)", 2);
  line(ctx, [[27, -46], [29, 0]], "rgba(0,13,51,.2)", 2);
  label(ctx, "BRADLEY", 0, -43, 10, "#f4fbff", 900);
  ctx.font = `900 38px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#072951";
  ctx.strokeText(String(frame.jersey), 0, -16);
  ctx.fillStyle = "#f6fcff";
  ctx.fillText(String(frame.jersey), 0, -16);
  label(ctx, "C", -33, -43, 10, "#dceefb");

  // Near glove and helmet include highlights, vents and a neck guard.
  ellipse(ctx, -42, -5, 13, 12, "#082953");
  line(ctx, [[-49, -12], [-35, -5]], "#d5e7f3", 3);
  line(ctx, [[-45, 3], [-16, -1], [55, 7]], "#1c3449", 6);
  line(ctx, [[-13, -1], [34, 5]], "#97aeb7", 1.5);
  ellipse(ctx, 0, -64, 14, 12, "#d9ac89");
  ellipse(ctx, 0, -77, 25, 26, "#073a87");
  const helmet = ctx.createLinearGradient(-18, -100, 16, -54);
  helmet.addColorStop(0, "#2a8bdf");
  helmet.addColorStop(0.4, "#0754b0");
  helmet.addColorStop(1, "#042761");
  ellipse(ctx, 0, -79, 23, 23, helmet);
  ctx.beginPath();
  ctx.ellipse(-3, -83, 18, 16, -0.3, Math.PI, Math.PI * 1.85);
  ctx.strokeStyle = "rgba(129,210,255,.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, [[-19, -68], [19, -68]], "#062c69", 5);
  for (const vent of [-10, 0, 10]) line(ctx, [[vent, -93], [vent - 1, -85]], "#032e70", 2.5);
  label(ctx, String(frame.jersey), 0, -62, 7, "#d4edff");
  ctx.restore();

  if (!frame.flight) {
    const puckX = x + 85;
    const puckY = 676;
    if (charge > 0.01) {
      ctx.save();
      ctx.shadowColor = "#07bfff";
      ctx.shadowBlur = 18 + charge * 22;
      ctx.beginPath();
      ctx.arc(puckX, puckY, 18 + charge * 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge);
      ctx.strokeStyle = charge > 0.82 ? "#edbd53" : "#1ab9f5";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    drawPuck(ctx, puckX, puckY, 11, 1);
  }
}

function drawPuck(ctx: Context, x: number, y: number, radius: number, opacity: number) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ellipse(ctx, x + 3, y + 7, radius + 3, radius * 0.3, "rgba(5,43,62,.2)");
  ellipse(ctx, x, y + 2.5, radius, radius * 0.46, "#030e18");
  ellipse(ctx, x, y, radius, radius * 0.45, "#163347");
  ctx.beginPath();
  ctx.ellipse(x, y - 0.7, radius - 1, radius * 0.35, 0, Math.PI, Math.PI * 1.9);
  ctx.strokeStyle = "#57839b";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawAim(ctx: Context, frame: ArenaFrame) {
  if (frame.phase !== "playing" && frame.phase !== "lobby") return;
  const x = Math.max(WORLD.netLeft + 8, Math.min(WORLD.netRight - 8, frame.aimX));
  const y = Math.max(WORLD.netTop + 8, Math.min(WORLD.netBottom - 8, frame.aimY));
  const pulse = frame.reducedMotion ? 0 : Math.sin(frame.time * 3) * 1.5;
  ctx.save();
  if (!frame.flight) {
    ctx.beginPath();
    ctx.moveTo(frame.playerX + 85, 662);
    ctx.lineTo(x, y);
    ctx.setLineDash([2, 13]);
    ctx.lineDashOffset = frame.reducedMotion ? 0 : -frame.time * 12;
    ctx.strokeStyle = "rgba(5,83,147,.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.shadowColor = "#0ab9ef";
  ctx.shadowBlur = 10;
  ellipse(ctx, x, y, 21 + pulse, 21 + pulse, "rgba(6,72,120,.17)");
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.strokeStyle = "#004b7c";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  for (const vector of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    line(ctx, [[x + vector[0] * 11, y + vector[1] * 11], [x + vector[0] * 22, y + vector[1] * 22]], "#ffffff", 2);
  }
  ellipse(ctx, x, y, 3.5, 3.5, "#e8fdff");
  ctx.restore();
}

function drawFlight(ctx: Context, frame: ArenaFrame) {
  const flight = frame.flight;
  if (!flight) return;
  const progress = Math.max(0, Math.min(1, flight.progress));
  const x = flight.fromX + (flight.toX - flight.fromX) * progress;
  const y = flight.fromY + (flight.toY - flight.fromY) * progress;
  const radius = 11 - progress * 5;
  if (!frame.reducedMotion) {
    ctx.save();
    for (let trail = 1; trail < 8; trail += 1) {
      const previous = Math.max(0, progress - trail * 0.018);
      const px = flight.fromX + (flight.toX - flight.fromX) * previous;
      const py = flight.fromY + (flight.toY - flight.fromY) * previous;
      ellipse(ctx, px, py, radius * (1 - trail * 0.075), radius * 0.4, `rgba(37,151,238,${0.19 - trail * 0.023})`);
    }
    ctx.restore();
  }
  drawPuck(ctx, x, y, radius, 1);
}

function drawCelebration(ctx: Context, frame: ArenaFrame) {
  if (frame.celebration <= 0) return;
  const amount = Math.min(1, frame.celebration);
  const accent = ROUNDS[frame.round]?.color ?? "#53cdff";
  ctx.save();
  ctx.globalAlpha = Math.min(0.7, amount);
  const glow = ctx.createRadialGradient(550, 260, 30, 550, 260, 360);
  glow.addColorStop(0, "rgba(122,218,255,.4)");
  glow.addColorStop(1, "rgba(122,218,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1100, 600);
  ctx.globalAlpha = Math.min(1, amount * 2);
  // Goal lamps and the videoboard react even without moving particles.
  for (const x of [359, 741]) {
    ctx.shadowColor = "#ff5764";
    ctx.shadowBlur = 27;
    ellipse(ctx, x, 224, 6, 9, "#ff6171");
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#08325a";
  ctx.fillRect(397, 78, 305, 29);
  label(ctx, frame.hatTrick ? "HAT TRICK, BRADLEY!" : "BRADLEY SCORES!", 550, 94, 21, "#ffffff");
  if (!frame.reducedMotion) {
    for (let index = 0; index < 62; index += 1) {
      const life = (frame.time * (0.31 + random(index + 103) * 0.27) + random(index + 301)) % 1;
      const x = random(index + 11) * 1100 + Math.sin(frame.time * 2 + index) * 25;
      const y = -40 + life * 780;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(frame.time * 2 + index);
      ctx.fillStyle = index % 3 === 0 ? "#fff6c6" : index % 3 === 1 ? accent : "#2373d4";
      ctx.fillRect(-3, -5, 6, 10);
      ctx.restore();
    }
    if (frame.hatTrick) {
      for (let index = 0; index < 7; index += 1) {
        const life = (frame.time * 0.3 + index / 7) % 1;
        ctx.save();
        ctx.translate(95 + index * 146, -30 + life * 760);
        ctx.rotate(Math.sin(frame.time + index) * 0.7);
        ellipse(ctx, 0, 0, 15, 6, "#06438b");
        path(ctx, [[-10, 0], [-9, -15], [9, -15], [10, 0]], "#0c64c3");
        line(ctx, [[-10, -2], [10, -2]], "#eefaff", 2);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

export function drawArena(ctx: Context, frame: ArenaFrame, portrait: HTMLImageElement | null): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.drawImage(getBackground(frame.round), 0, 0, WORLD.width, WORLD.height);
  drawLights(ctx, frame);
  drawGoalie(ctx, frame);
  drawPlayer(ctx, frame);
  drawFlight(ctx, frame);
  drawCelebration(ctx, frame);
  // The aiming reticle is drawn last to stay legible over players and effects.
  drawAim(ctx, frame);
  if (portrait?.complete && portrait.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(327, 94, 19, 0, Math.PI * 2);
    ctx.clip();
    const side = Math.min(portrait.naturalWidth, portrait.naturalHeight);
    ctx.drawImage(portrait, (portrait.naturalWidth - side) / 2, (portrait.naturalHeight - side) / 2, side, side, 308, 75, 38, 38);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(327, 94, 20, 0, Math.PI * 2);
    ctx.strokeStyle = "#98dfff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}
