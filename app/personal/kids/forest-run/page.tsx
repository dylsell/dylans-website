"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Nav from "../../../components/Nav";

const CW = 900;
const CH = 450;
const GY = 342;
const BX = 143;
const BW = 75;
const BH = 114;
const GRAV = 0.58;
const JVEL = -19;
const POWER_FRAMES = 420; // ~7s of star power
const SPIN_FRAMES = 28;   // double-jump front flip duration

type Phase = "idle" | "running" | "dead";

interface Log  { x: number; w: number; h: number }
interface Coin { x: number; y: number; collected: boolean; animT: number }
interface FarTree  { x: number; h: number }
interface MidTree  { x: number; h: number; sp: number }
interface Bush     { x: number; w: number; h: number }
interface Cloud    { x: number; y: number; w: number; sp: number }
interface StarPU   { x: number; y: number; animT: number }
interface Fleck    { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }

// Sky colors: dawn → morning → day → sunset, keyed by score milestone
const SKY_STOPS: [number, string, string][] = [
  [0,   "#f4a261", "#f9d89c"],   // dawn
  [60,  "#5bb8e8", "#a8d8a0"],   // day
  [200, "#e07b39", "#f4c07a"],   // afternoon
  [400, "#6b3fa0", "#e07b39"],   // dusk
  [700, "#0d1b4b", "#3a1f6b"],   // night
];

function skyColor(score: number): [string, string] {
  for (let i = SKY_STOPS.length - 1; i >= 0; i--) {
    if (score >= SKY_STOPS[i][0]) return [SKY_STOPS[i][1], SKY_STOPS[i][2]];
  }
  return [SKY_STOPS[0][1], SKY_STOPS[0][2]];
}

function playRoar(ac: AudioContext) {
  // Distortion waveshaper for growl
  const shaper = ac.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = (Math.PI + 400) * x / (Math.PI + 400 * Math.abs(x));
  }
  shaper.curve = curve;

  // Main growl: sawtooth dropping in pitch
  const osc1 = ac.createOscillator();
  const gain1 = ac.createGain();
  osc1.connect(shaper); shaper.connect(gain1); gain1.connect(ac.destination);
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(200, ac.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.9);
  gain1.gain.setValueAtTime(0.28, ac.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.1);
  osc1.start(); osc1.stop(ac.currentTime + 1.1);

  // Sub bass layer
  const osc2 = ac.createOscillator();
  const gain2 = ac.createGain();
  osc2.connect(gain2); gain2.connect(ac.destination);
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(100, ac.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(28, ac.currentTime + 0.8);
  gain2.gain.setValueAtTime(0.18, ac.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.0);
  osc2.start(); osc2.stop(ac.currentTime + 1.0);
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function makeFarTrees(): FarTree[] {
  return Array.from({ length: 12 }, (_, i) => ({
    x: i * (CW / 12) + Math.random() * 30,
    h: 52 + Math.random() * 45,
  }));
}
function makeMidTrees(): MidTree[] {
  return Array.from({ length: 9 }, (_, i) => ({
    x: i * (CW / 9) + Math.random() * 45,
    h: 75 + Math.random() * 75,
    sp: 1.0 + Math.random() * 0.8,
  }));
}
function makeBushes(): Bush[] {
  return Array.from({ length: 7 }, (_, i) => ({
    x: i * (CW / 7) + Math.random() * 60,
    w: 30 + Math.random() * 45,
    h: 18 + Math.random() * 15,
  }));
}
function makeClouds(): Cloud[] {
  return Array.from({ length: 4 }, (_, i) => ({
    x: i * (CW / 4) + Math.random() * 80,
    y: 30 + Math.random() * 70,
    w: 70 + Math.random() * 60,
    sp: 0.15 + Math.random() * 0.25,
  }));
}
function makeNightStars() {
  return Array.from({ length: 30 }, () => ({
    x: Math.random() * CW,
    y: Math.random() * 180,
    r: 0.8 + Math.random() * 1.4,
  }));
}

const MILESTONES = [50, 100, 200, 300, 500, 750, 1000];
const BEST_KEY = "forest-run-best";

export default function ForestRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const bradleyImg = useRef<HTMLImageElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [best, setBest] = useState(0);

  const bloop = useRef((freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12, freqEnd?: number) => {
    const ac = audioCtx.current;
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + dur);
  });

  const gs = useRef({
    phase: "idle" as Phase,
    by: GY - BH, vy: 0, grounded: true,
    jumps: 0,          // jumps used since last landing (max 2)
    spinT: 0,          // double-jump flip countdown
    logs: [] as Log[],
    coins: [] as Coin[],
    farTrees: makeFarTrees(),
    midTrees: makeMidTrees(),
    bushes: makeBushes(),
    clouds: makeClouds(),
    nightStars: makeNightStars(),
    flecks: [] as Fleck[],       // dust + smash particles
    starPU: null as StarPU | null,
    nextStar: 700,
    power: 0,          // star-power frames remaining
    frame: 0, speed: 4, score: 0, best: 0, coinsRun: 0,
    nextLog: 90, nextCoin: 120,
    flash: 0,         // death flash countdown
    milestone: "",    // text to show
    milestoneT: 0,    // countdown
    passedMilestones: new Set<number>(),
    bearLunge: 0,     // death pounce animation frames
    deathAt: 0,       // so mashing jump doesn't instantly restart
  });

  const act = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const s = gs.current;

    const startRun = () => {
      Object.assign(s, {
        phase: "running",
        by: GY - BH, vy: 0, grounded: true, jumps: 0, spinT: 0,
        logs: [], coins: [], flecks: [],
        farTrees: makeFarTrees(), midTrees: makeMidTrees(), bushes: makeBushes(),
        starPU: null, nextStar: 700, power: 0,
        frame: 0, speed: 4, score: 0, coinsRun: 0,
        nextLog: 90, nextCoin: 120,
        flash: 0, milestone: "", milestoneT: 0,
        passedMilestones: new Set<number>(),
        bearLunge: 0,
      });
      setPhase("running");
      bloop.current(300, 0.12, "sine", 0.15, 500);
    };

    if (s.phase === "idle") {
      startRun();
    } else if (s.phase === "running") {
      if (s.grounded) {
        s.vy = JVEL;
        s.grounded = false;
        s.jumps = 1;
        bloop.current(280, 0.14, "sine", 0.18, 560);
      } else if (s.jumps < 2) {
        // Double jump — with a front flip!
        s.vy = JVEL * 0.85;
        s.jumps = 2;
        s.spinT = SPIN_FRAMES;
        bloop.current(420, 0.14, "sine", 0.18, 840);
      }
    } else if (s.phase === "dead" && Date.now() - s.deathAt > 600) {
      startRun();
    }
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = "/bradley/hoodie.png";
    img.onload = () => { bradleyImg.current = img; };
    // Best score persists across visits
    const b = Number(localStorage.getItem(BEST_KEY) || 0);
    if (b > 0) { gs.current.best = b; setBest(b); }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Crisp rendering on retina screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const loop = () => {
      const s = gs.current;
      ctx.clearRect(0, 0, CW, CH);

      // ── Dynamic sky ─────────────────────────────────────────────────────
      const [skyTop, skyBot] = skyColor(s.score);
      const skyG = ctx.createLinearGradient(0, 0, 0, GY);
      skyG.addColorStop(0, skyTop);
      skyG.addColorStop(1, skyBot);
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, CW, GY);

      // ── Night stars fade in at dusk ─────────────────────────────────────
      const nightAlpha = Math.min(1, Math.max(0, (s.score - 550) / 200));
      if (nightAlpha > 0) {
        s.nightStars.forEach((st, i) => {
          const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(s.frame * 0.04 + i * 1.7));
          ctx.fillStyle = `rgba(255,255,240,${(nightAlpha * twinkle).toFixed(2)})`;
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
        });
      }

      // ── Clouds drift slowly ─────────────────────────────────────────────
      s.clouds.forEach(c => {
        if (s.phase === "running") {
          c.x -= c.sp * (s.speed / 4);
          if (c.x + c.w < 0) { c.x = CW + c.w; c.y = 30 + Math.random() * 70; }
        }
        ctx.globalAlpha = 0.75 * (1 - nightAlpha * 0.65);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, c.w / 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.25, c.y + 4, c.w / 3.2, c.w / 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.28, c.y + 3, c.w / 3.5, c.w / 8.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ── Layer 1: far trees (very slow) ──────────────────────────────────
      s.farTrees.forEach(t => {
        if (s.phase === "running") {
          t.x -= 0.5;
          if (t.x + t.h < 0) { t.x = CW + t.h; t.h = 52 + Math.random() * 45; }
        }
        const tw = t.h * 0.55;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#1a4a0a";
        ctx.fillRect(t.x + tw * 0.4, GY - t.h * 0.45, tw * 0.2, t.h * 0.45);
        ctx.beginPath(); ctx.arc(t.x + tw * 0.5, GY - t.h * 0.55, tw * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(t.x + tw * 0.5, GY - t.h * 0.8, tw * 0.27, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ── Layer 2: mid trees (medium speed) ───────────────────────────────
      s.midTrees.forEach(t => {
        if (s.phase === "running") {
          t.x -= t.sp * (s.speed / 4);
          if (t.x + t.h < 0) { t.x = CW + t.h; t.h = 75 + Math.random() * 75; t.sp = 1.0 + Math.random() * 0.8; }
        }
        const tw = t.h * 0.65;
        ctx.fillStyle = "#7a4520";
        ctx.fillRect(t.x + tw * 0.38, GY - t.h * 0.48, tw * 0.24, t.h * 0.48);
        ([ ["#2a6e1a", 0.44, 0.48], ["#35882a", 0.33, 0.72], ["#4aa030", 0.22, 0.92] ] as [string, number, number][]).forEach(([c, r, dy]) => {
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.arc(t.x + tw * 0.5, GY - t.h * dy, tw * r, 0, Math.PI * 2); ctx.fill();
        });
      });

      // Ground
      ctx.fillStyle = "#3a6820"; ctx.fillRect(0, GY, CW, CH - GY);
      ctx.fillStyle = "#52901e"; ctx.fillRect(0, GY, CW, 10);

      // ── Layer 3: near bushes (fast) ──────────────────────────────────────
      s.bushes.forEach(b => {
        if (s.phase === "running") {
          b.x -= s.speed * 1.6;
          if (b.x + b.w < 0) { b.x = CW + b.w; b.w = 30 + Math.random() * 45; b.h = 18 + Math.random() * 15; }
        }
        ctx.fillStyle = "#2d5e12";
        ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, GY - b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3d7a1a";
        ctx.beginPath(); ctx.ellipse(b.x + b.w * 0.3, GY - b.h * 0.6, b.w * 0.28, b.h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      });

      // ── Game logic ───────────────────────────────────────────────────────
      if (s.phase === "running") {
        s.frame++;
        s.score = Math.floor(s.frame / 6) + s.coinsRun * 10;
        s.speed = 4 + s.frame / 500;
        if (s.power > 0) s.power--;

        // Milestone check
        for (const m of MILESTONES) {
          if (s.score >= m && !s.passedMilestones.has(m)) {
            s.passedMilestones.add(m);
            s.milestone = `${m}m! 🎉`;
            s.milestoneT = 90;
            bloop.current(523, 0.1, "sine", 0.2, 784);
            setTimeout(() => bloop.current(784, 0.12, "sine", 0.2, 1047), 120);
          }
        }
        if (s.milestoneT > 0) s.milestoneT--;

        // Spawn logs
        s.nextLog--;
        if (s.nextLog <= 0) {
          s.logs.push({ x: CW + 10, w: 42 + Math.random() * 21, h: 36 + Math.random() * 36 });
          s.nextLog = Math.max(50, 92 - s.frame / 80);
        }

        // Spawn coins
        s.nextCoin--;
        if (s.nextCoin <= 0) {
          s.coins.push({ x: CW + 10, y: GY - 82 - Math.random() * 90, collected: false, animT: 0 });
          s.nextCoin = 80 + Math.random() * 100;
        }

        // Spawn star power-up every ~15-25 seconds
        if (!s.starPU) {
          s.nextStar--;
          if (s.nextStar <= 0) {
            s.starPU = { x: CW + 20, y: GY - 110 - Math.random() * 70, animT: 0 };
          }
        } else {
          s.starPU.x -= s.speed;
          s.starPU.animT += 0.1;
          if (s.starPU.x < -30) { s.starPU = null; s.nextStar = 900 + Math.random() * 600; }
        }

        // Move logs
        s.logs = s.logs.map(l => ({ ...l, x: l.x - s.speed })).filter(l => l.x + l.w > 0);

        // Move coins
        s.coins = s.coins.map(c => ({ ...c, x: c.x - s.speed, animT: c.animT + 0.08 }))
          .filter(c => c.x > -20);

        // Physics
        s.vy += GRAV;
        s.by += s.vy;
        if (s.by >= GY - BH) {
          if (!s.grounded) {
            // Landing puff
            for (let i = 0; i < 4; i++) {
              s.flecks.push({
                x: BX + 10 + Math.random() * (BW - 20), y: GY - 3,
                vx: (Math.random() - 0.5) * 3, vy: -0.5 - Math.random(),
                life: 14, maxLife: 14, size: 3 + Math.random() * 3, color: "150,130,90",
              });
            }
          }
          s.by = GY - BH; s.vy = 0; s.grounded = true; s.jumps = 0; s.spinT = 0;
        }

        // Running dust
        if (s.grounded && s.frame % 7 === 0) {
          s.flecks.push({
            x: BX + 6 + Math.random() * 10, y: GY - 2,
            vx: -1.5 - Math.random() * 1.5, vy: -0.4 - Math.random() * 0.8,
            life: 16, maxLife: 16, size: 2.5 + Math.random() * 3, color: "150,130,90",
          });
        }

        // Footsteps
        if (s.grounded && s.frame % 21 === 0) {
          bloop.current(140 + Math.random() * 30, 0.07, "triangle", 0.07);
        }

        // Coin collision
        const bcX = BX + BW / 2, bcY = s.by + BH / 2;
        s.coins.forEach(c => {
          if (!c.collected && Math.abs(bcX - c.x) < BW * 0.7 && Math.abs(bcY - c.y) < BH * 0.6) {
            c.collected = true;
            s.coinsRun++;
            bloop.current(880, 0.05, "sine", 0.18, 1200);
            setTimeout(() => bloop.current(1200, 0.08, "sine", 0.15), 60);
          }
        });
        s.coins = s.coins.filter(c => !c.collected);

        // Star power-up collision
        if (s.starPU && Math.abs(bcX - s.starPU.x) < BW * 0.75 && Math.abs(bcY - s.starPU.y) < BH * 0.65) {
          s.starPU = null;
          s.nextStar = 1100 + Math.random() * 700;
          s.power = POWER_FRAMES;
          // Rising fanfare
          [523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => bloop.current(f, 0.14, "square", 0.1), i * 90));
        }

        // Log collision — star power smashes right through!
        const bL = BX + 9, bR = BX + BW - 9, bB = s.by + BH - 8;
        const smashed = new Set<Log>();
        for (const l of s.logs) {
          if (bR > l.x + 5 && bL < l.x + l.w - 5 && bB > GY - l.h + 4) {
            if (s.power > 0) {
              smashed.add(l);
              s.score += 5;
              for (let i = 0; i < 12; i++) {
                s.flecks.push({
                  x: l.x + Math.random() * l.w, y: GY - Math.random() * l.h,
                  vx: (Math.random() - 0.2) * 7, vy: -2 - Math.random() * 4,
                  life: 24, maxLife: 24, size: 3 + Math.random() * 5, color: "160,85,37",
                });
              }
              bloop.current(120, 0.16, "square", 0.16, 60);
            } else {
              s.phase = "dead";
              s.flash = 12;
              s.bearLunge = 0;
              s.deathAt = Date.now();
              if (s.score > s.best) {
                s.best = s.score;
                localStorage.setItem(BEST_KEY, String(s.best));
              }
              if (audioCtx.current) playRoar(audioCtx.current);
              setPhase("dead"); setBest(s.best);
              break;
            }
          }
        }
        if (smashed.size) s.logs = s.logs.filter(l => !smashed.has(l));

      }

      // ── Particles (dust, smash debris) — animate in every phase ─────────
      s.flecks = s.flecks.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life--;
        if (p.life <= 0) return false;
        ctx.fillStyle = `rgba(${p.color},${(p.life / p.maxLife).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        return true;
      });

      // ── Draw logs ────────────────────────────────────────────────────────
      s.logs.forEach(l => {
        const lg = ctx.createLinearGradient(l.x, 0, l.x + l.w, 0);
        lg.addColorStop(0, "#7B3B11"); lg.addColorStop(0.5, "#A05525"); lg.addColorStop(1, "#7B3B11");
        ctx.fillStyle = lg; ctx.fillRect(l.x, GY - l.h, l.w, l.h);
        ctx.strokeStyle = "#5a2b08"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(l.x + l.w / 2, GY - l.h, l.w / 2 - 1, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(l.x + l.w / 2, GY, l.w / 2 - 1, 5, 0, 0, Math.PI); ctx.stroke();
      });

      // ── Draw coins ───────────────────────────────────────────────────────
      s.coins.forEach(c => {
        const floatY = c.y + Math.sin(c.animT) * 5;
        // Glow
        const grd = ctx.createRadialGradient(c.x, floatY, 3, c.x, floatY, 20);
        grd.addColorStop(0, "rgba(255,220,0,0.4)");
        grd.addColorStop(1, "rgba(255,180,0,0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(c.x, floatY, 20, 0, Math.PI * 2); ctx.fill();
        // Coin
        ctx.fillStyle = "#FFD700";
        ctx.beginPath(); ctx.arc(c.x, floatY, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#FFA500"; ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "#FFB300"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("$", c.x, floatY + 5);
        ctx.textAlign = "left";
      });

      // ── Draw star power-up ───────────────────────────────────────────────
      if (s.starPU) {
        const sy = s.starPU.y + Math.sin(s.starPU.animT) * 6;
        const grd = ctx.createRadialGradient(s.starPU.x, sy, 4, s.starPU.x, sy, 30);
        grd.addColorStop(0, "rgba(255,240,80,0.55)");
        grd.addColorStop(1, "rgba(255,200,0,0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(s.starPU.x, sy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.font = "34px serif"; ctx.textAlign = "center";
        ctx.fillText("⭐", s.starPU.x, sy + 12);
        ctx.textAlign = "left";
      }

      // ── Bear (chases; pounces when he catches you) ──────────────────────
      const drawBear = (x: number, size: number, bob: number) => {
        ctx.font = `${size}px serif`;
        ctx.fillText("🐻", x, GY - 4 + bob);
      };
      if (s.phase === "running") {
        const bearScale = Math.min(1.3, 0.55 + s.frame / 2200); // grows from 0.55x → 1.3x
        drawBear(10, Math.floor(72 * bearScale), Math.sin(s.frame * 0.18) * 4 * bearScale);
      }

      // ── Bradley shadow ───────────────────────────────────────────────────
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath(); ctx.ellipse(BX + BW / 2, GY + 5, BW * 0.45, 5, 0, 0, Math.PI * 2); ctx.fill();

      // ── Bradley sprite (flips on double jump, glows with star power) ────
      const bob = s.phase === "running" && s.grounded ? Math.sin(s.frame * 0.3) * 2.5 : 0;
      const by = s.by + bob;
      ctx.save();
      if (s.spinT > 0) {
        s.spinT--;
        const ang = (1 - s.spinT / SPIN_FRAMES) * Math.PI * 2;
        ctx.translate(BX + BW / 2, by + BH / 2);
        ctx.rotate(ang);
        ctx.translate(-(BX + BW / 2), -(by + BH / 2));
      }
      const powerBlink = s.power > 0 && (s.power > 90 || s.frame % 10 < 5);
      if (powerBlink) {
        ctx.shadowColor = `hsl(${(s.frame * 9) % 360}, 95%, 60%)`;
        ctx.shadowBlur = 22;
      }
      ctx.save();
      rrect(ctx, BX, by, BW, BH, 8); ctx.clip();
      if (bradleyImg.current) {
        ctx.drawImage(bradleyImg.current, BX, by, BW, BH);
      } else {
        ctx.fillStyle = "#f9c784"; ctx.fillRect(BX, by, BW, BH);
      }
      ctx.restore();
      ctx.strokeStyle = powerBlink
        ? `hsl(${(s.frame * 9) % 360}, 95%, 62%)`
        : "rgba(255,255,255,0.85)";
      ctx.lineWidth = powerBlink ? 4 : 2;
      rrect(ctx, BX, by, BW, BH, 8); ctx.stroke();
      ctx.restore();

      // Bear pounce — drawn over Bradley after death
      if (s.phase === "dead") {
        if (s.bearLunge < 26) s.bearLunge++;
        const t = s.bearLunge / 26;
        const ease = 1 - (1 - t) * (1 - t);
        const bearX = 10 + ease * (BX - 40);
        const hop = Math.sin(t * Math.PI) * -46;
        drawBear(bearX, 92, hop);
      }

      // ── HUD ──────────────────────────────────────────────────────────────
      if (s.phase === "running") {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        rrect(ctx, 14, 14, 244, 46, 10); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 22px system-ui, sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`🏃 ${s.score}m`, 28, 46);
        ctx.fillText(`🪙 ${s.coinsRun}`, 168, 46);

        // Star-power countdown bar
        if (s.power > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          rrect(ctx, 14, 66, 160, 10, 5); ctx.fill();
          ctx.fillStyle = `hsl(${(s.frame * 9) % 360}, 95%, 58%)`;
          rrect(ctx, 16, 68, 156 * (s.power / POWER_FRAMES), 6, 3); ctx.fill();
        }

        // Milestone popup
        if (s.milestoneT > 0) {
          const alpha = Math.min(1, s.milestoneT / 20);
          const yOff = (90 - s.milestoneT) * 0.6;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#FFD700"; ctx.font = "bold 38px system-ui, sans-serif"; ctx.textAlign = "center";
          ctx.fillText(s.milestone, CW / 2, 82 - yOff);
          ctx.globalAlpha = 1; ctx.textAlign = "left";
        }
      }

      // ── Death flash ──────────────────────────────────────────────────────
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,80,80,${s.flash / 12 * 0.65})`;
        ctx.fillRect(0, 0, CW, CH);
        s.flash--;
      }

      // ── Start overlay ────────────────────────────────────────────────────
      if (s.phase === "idle") {
        ctx.fillStyle = "rgba(0,30,0,0.68)"; ctx.fillRect(0, 0, CW, CH);
        ctx.textAlign = "center";
        ctx.fillStyle = "white"; ctx.font = "bold 42px system-ui, sans-serif";
        ctx.fillText("🌲 Bradley's Forest Run! 🌲", CW / 2, 100);
        ctx.fillStyle = "#b8f0b8"; ctx.font = "22px system-ui, sans-serif";
        ctx.fillText("Jump logs · double-jump in the air · grab the ⭐ to smash!", CW / 2, 150);
        if (gs.current.best > 0) {
          ctx.fillStyle = "#FFD700"; ctx.font = "bold 24px system-ui, sans-serif";
          ctx.fillText(`🏆 Best: ${gs.current.best}m`, CW / 2, 192);
        }
        const pulse = 0.96 + Math.sin(Date.now() / 350) * 0.04;
        ctx.save(); ctx.translate(CW / 2, 270); ctx.scale(pulse, pulse);
        ctx.fillStyle = "#4ade80"; rrect(ctx, -130, -30, 260, 60, 18); ctx.fill();
        ctx.fillStyle = "#14532d"; ctx.font = "bold 30px system-ui, sans-serif"; ctx.fillText("🌿 TAP TO START!", 0, 10);
        ctx.restore(); ctx.textAlign = "left";
      }

      // ── Dead overlay ─────────────────────────────────────────────────────
      if (s.phase === "dead") {
        ctx.fillStyle = "rgba(50,0,0,0.75)"; ctx.fillRect(0, 0, CW, CH);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff7070"; ctx.font = "bold 48px system-ui, sans-serif";
        ctx.fillText("The bear got you! 🐻", CW / 2, 105);
        ctx.fillStyle = "white"; ctx.font = "bold 36px system-ui, sans-serif";
        ctx.fillText(`You ran ${s.score}m!`, CW / 2, 165);
        ctx.fillStyle = "#FFD700"; ctx.font = "26px system-ui, sans-serif";
        const bits = [`🪙 ${s.coinsRun} coins`];
        if (s.best > 0) bits.push(`🏆 Best: ${s.best}m`);
        ctx.fillText(bits.join("   ·   "), CW / 2, 215);
        if (s.score >= s.best && s.best > 0 && s.score > 0) {
          ctx.fillStyle = "#7CFC9A"; ctx.font = "bold 24px system-ui, sans-serif";
          ctx.fillText("🌟 NEW BEST! 🌟", CW / 2, 255);
        }
        const pulse = 0.96 + Math.sin(Date.now() / 350) * 0.04;
        ctx.save(); ctx.translate(CW / 2, 315); ctx.scale(pulse, pulse);
        ctx.fillStyle = "#fb923c"; rrect(ctx, -140, -30, 280, 60, 16); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 28px system-ui, sans-serif";
        ctx.fillText("🔄 TAP TO TRY AGAIN!", 0, 10);
        ctx.restore(); ctx.textAlign = "left";
      }

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); act(); }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [act]);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 pb-16 flex flex-col items-center">
        <div className="w-full max-w-[900px]">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-3">Kids Games</p>
              <h1 className="text-4xl font-black text-white mb-1">Bradley&apos;s Forest Run</h1>
              <p className="text-zinc-500">Jump logs · grab the ⭐ · escape the bear!</p>
            </div>
            {best > 0 && (
              <div className="text-right">
                <p className="text-zinc-600 text-sm">Best</p>
                <p className="text-yellow-400 font-black text-2xl">🏆 {best}m</p>
              </div>
            )}
          </div>

          <div className="w-full cursor-pointer select-none mt-3" style={{ aspectRatio: "2/1", touchAction: "manipulation" }} onPointerDown={act}>
            <canvas ref={canvasRef} width={CW} height={CH} className="w-full h-full rounded-2xl shadow-2xl" />
          </div>

          <button
            onPointerDown={(e) => { e.preventDefault(); act(); }}
            className="mt-5 w-full py-5 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-white font-black text-2xl shadow-lg select-none"
            style={{ touchAction: "manipulation" }}
          >
            {phase === "idle" ? "🌲 START!" : phase === "dead" ? "🔄 TRY AGAIN!" : "⬆️ JUMP!"}
          </button>

          <p className="text-center text-zinc-600 text-sm mt-3">
            SPACE or tap to jump · tap again in the air to double-jump flip! · ⭐ = smash through logs
          </p>
        </div>
      </main>
    </>
  );
}
