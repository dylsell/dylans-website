"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Nav from "../../components/Nav";

const CW = 600;
const CH = 300;
const GY = 228;
const BX = 95;
const BW = 50;
const BH = 76;
const GRAV = 0.58;
const JVEL = -13;

type Phase = "idle" | "running" | "dead";

interface Log  { x: number; w: number; h: number }
interface Coin { x: number; y: number; collected: boolean; animT: number }
interface FarTree  { x: number; h: number }
interface MidTree  { x: number; h: number; sp: number }
interface Bush     { x: number; w: number; h: number }

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
    x: i * (CW / 12) + Math.random() * 20,
    h: 35 + Math.random() * 30,
  }));
}
function makeMidTrees(): MidTree[] {
  return Array.from({ length: 9 }, (_, i) => ({
    x: i * (CW / 9) + Math.random() * 30,
    h: 50 + Math.random() * 50,
    sp: 1.0 + Math.random() * 0.8,
  }));
}
function makeBushes(): Bush[] {
  return Array.from({ length: 7 }, (_, i) => ({
    x: i * (CW / 7) + Math.random() * 40,
    w: 20 + Math.random() * 30,
    h: 12 + Math.random() * 10,
  }));
}

const MILESTONES = [50, 100, 200, 300, 500, 750, 1000];

export default function ForestRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const bradleyImg = useRef<HTMLImageElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
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
    logs: [] as Log[],
    coins: [] as Coin[],
    farTrees: makeFarTrees(),
    midTrees: makeMidTrees(),
    bushes: makeBushes(),
    frame: 0, speed: 4, score: 0, best: 0,
    nextLog: 90, nextCoin: 120,
    flash: 0,         // death flash countdown
    milestone: "",    // text to show
    milestoneT: 0,    // countdown
    passedMilestones: new Set<number>(),
  });

  const act = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const s = gs.current;
    if (s.phase === "idle") {
      Object.assign(s, {
        phase: "running",
        by: GY - BH, vy: 0, grounded: true,
        logs: [], coins: [],
        farTrees: makeFarTrees(), midTrees: makeMidTrees(), bushes: makeBushes(),
        frame: 0, speed: 4, score: 0,
        nextLog: 90, nextCoin: 120,
        flash: 0, milestone: "", milestoneT: 0,
        passedMilestones: new Set<number>(),
      });
      setPhase("running");
      bloop.current(300, 0.12, "sine", 0.15, 500);
    } else if (s.phase === "running" && s.grounded) {
      s.vy = JVEL;
      s.grounded = false;
      bloop.current(280, 0.14, "sine", 0.18, 560);
    } else if (s.phase === "dead") {
      s.phase = "idle";
      setPhase("idle");
    }
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = "/bradley/hoodie.png";
    img.onload = () => { bradleyImg.current = img; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

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

      // ── Layer 1: far trees (very slow) ──────────────────────────────────
      s.farTrees.forEach(t => {
        if (s.phase === "running") {
          t.x -= 0.5;
          if (t.x + t.h < 0) { t.x = CW + t.h; t.h = 35 + Math.random() * 30; }
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
          if (t.x + t.h < 0) { t.x = CW + t.h; t.h = 50 + Math.random() * 50; t.sp = 1.0 + Math.random() * 0.8; }
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
          if (b.x + b.w < 0) { b.x = CW + b.w; b.w = 20 + Math.random() * 30; b.h = 12 + Math.random() * 10; }
        }
        ctx.fillStyle = "#2d5e12";
        ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, GY - b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3d7a1a";
        ctx.beginPath(); ctx.ellipse(b.x + b.w * 0.3, GY - b.h * 0.6, b.w * 0.28, b.h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      });

      // ── Game logic ───────────────────────────────────────────────────────
      if (s.phase === "running") {
        s.frame++;
        s.score = Math.floor(s.frame / 6);
        s.speed = 4 + s.frame / 500;

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
          s.logs.push({ x: CW + 10, w: 28 + Math.random() * 14, h: 24 + Math.random() * 24 });
          s.nextLog = Math.max(50, 92 - s.frame / 80);
        }

        // Spawn coins
        s.nextCoin--;
        if (s.nextCoin <= 0) {
          s.coins.push({ x: CW + 10, y: GY - 55 - Math.random() * 60, collected: false, animT: 0 });
          s.nextCoin = 80 + Math.random() * 100;
        }

        // Move logs
        s.logs = s.logs.map(l => ({ ...l, x: l.x - s.speed })).filter(l => l.x + l.w > 0);

        // Move coins
        s.coins = s.coins.map(c => ({ ...c, x: c.x - s.speed, animT: c.animT + 0.08 }))
          .filter(c => c.x > -20);

        // Physics
        s.vy += GRAV;
        s.by += s.vy;
        if (s.by >= GY - BH) { s.by = GY - BH; s.vy = 0; s.grounded = true; }

        // Footsteps
        if (s.grounded && s.frame % 21 === 0) {
          bloop.current(140 + Math.random() * 30, 0.07, "triangle", 0.07);
        }

        // Coin collision
        const bcX = BX + BW / 2, bcY = s.by + BH / 2;
        s.coins.forEach(c => {
          if (!c.collected && Math.abs(bcX - c.x) < BW * 0.7 && Math.abs(bcY - c.y) < BH * 0.6) {
            c.collected = true;
            s.score += 10;
            s.frame += 60; // bonus meters
            bloop.current(880, 0.05, "sine", 0.18, 1200);
            setTimeout(() => bloop.current(1200, 0.08, "sine", 0.15), 60);
          }
        });
        s.coins = s.coins.filter(c => !c.collected);

        // Log collision (generous hitbox)
        const bL = BX + 9, bR = BX + BW - 9, bB = s.by + BH - 8;
        for (const l of s.logs) {
          if (bR > l.x + 5 && bL < l.x + l.w - 5 && bB > GY - l.h + 4) {
            s.phase = "dead";
            s.flash = 12;
            if (s.score > s.best) s.best = s.score;
            bloop.current(400, 0.5, "sawtooth", 0.2, 60);
            setPhase("dead"); setScore(s.score); setBest(s.best);
            break;
          }
        }

        if (s.frame % 8 === 0) setScore(s.score);
      }

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
        const grd = ctx.createRadialGradient(c.x, floatY, 2, c.x, floatY, 14);
        grd.addColorStop(0, "rgba(255,220,0,0.4)");
        grd.addColorStop(1, "rgba(255,180,0,0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(c.x, floatY, 14, 0, Math.PI * 2); ctx.fill();
        // Coin
        ctx.fillStyle = "#FFD700";
        ctx.beginPath(); ctx.arc(c.x, floatY, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#FFA500"; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#FFB300"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("$", c.x, floatY + 3.5);
        ctx.textAlign = "left";
      });

      // ── Bear (scales closer over time) ──────────────────────────────────
      if (s.phase === "running" || s.phase === "dead") {
        const bearScale = Math.min(1, 0.4 + s.frame / 3000); // grows from 0.4x → 1x
        const bearSize = Math.floor(44 * bearScale);
        const bearBob = Math.sin(s.frame * 0.18) * 4 * bearScale;
        ctx.font = `${bearSize}px serif`;
        ctx.fillText("🐻", 10, GY - 4 + bearBob);
      }

      // ── Bradley shadow ───────────────────────────────────────────────────
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath(); ctx.ellipse(BX + BW / 2, GY + 5, BW * 0.45, 5, 0, 0, Math.PI * 2); ctx.fill();

      // ── Bradley sprite ───────────────────────────────────────────────────
      const bob = s.phase === "running" ? Math.sin(s.frame * 0.3) * 2.5 : 0;
      const by = s.by + bob;
      ctx.save();
      rrect(ctx, BX, by, BW, BH, 8); ctx.clip();
      if (bradleyImg.current) {
        ctx.drawImage(bradleyImg.current, BX, by, BW, BH);
      } else {
        ctx.fillStyle = "#f9c784"; ctx.fillRect(BX, by, BW, BH);
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2;
      rrect(ctx, BX, by, BW, BH, 8); ctx.stroke();

      // ── HUD ──────────────────────────────────────────────────────────────
      if (s.phase === "running") {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        rrect(ctx, 10, 10, 116, 34, 8); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 15px system-ui, sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`🏃 ${s.score}m`, 20, 32);

        // Milestone popup
        if (s.milestoneT > 0) {
          const alpha = Math.min(1, s.milestoneT / 20);
          const yOff = (90 - s.milestoneT) * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#FFD700"; ctx.font = "bold 26px system-ui, sans-serif"; ctx.textAlign = "center";
          ctx.fillText(s.milestone, CW / 2, 55 - yOff);
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
        ctx.fillStyle = "white"; ctx.font = "bold 28px system-ui, sans-serif";
        ctx.fillText("🌲 Bradley's Forest Run! 🌲", CW / 2, 66);
        ctx.fillStyle = "#b8f0b8"; ctx.font = "16px system-ui, sans-serif";
        ctx.fillText("Jump over logs · collect coins · escape the bear!", CW / 2, 102);
        const pulse = 0.96 + Math.sin(Date.now() / 350) * 0.04;
        ctx.save(); ctx.translate(CW / 2, 175); ctx.scale(pulse, pulse);
        ctx.fillStyle = "#4ade80"; rrect(ctx, -90, -22, 180, 44, 14); ctx.fill();
        ctx.fillStyle = "#14532d"; ctx.font = "bold 20px system-ui, sans-serif"; ctx.fillText("🌿 TAP TO START!", 0, 7);
        ctx.restore(); ctx.textAlign = "left";
      }

      // ── Dead overlay ─────────────────────────────────────────────────────
      if (s.phase === "dead") {
        ctx.fillStyle = "rgba(50,0,0,0.75)"; ctx.fillRect(0, 0, CW, CH);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff7070"; ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText("The bear got you! 🐻", CW / 2, 65);
        ctx.fillStyle = "white"; ctx.font = "bold 24px system-ui, sans-serif";
        ctx.fillText(`You ran ${s.score}m!`, CW / 2, 115);
        if (s.best > 0) {
          ctx.fillStyle = "#FFD700"; ctx.font = "18px system-ui, sans-serif";
          ctx.fillText(`Best: ${s.best}m`, CW / 2, 150);
        }
        const pulse = 0.96 + Math.sin(Date.now() / 350) * 0.04;
        ctx.save(); ctx.translate(CW / 2, 205); ctx.scale(pulse, pulse);
        ctx.fillStyle = "#fb923c"; rrect(ctx, -100, -22, 200, 44, 12); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 19px system-ui, sans-serif";
        ctx.fillText("🔄 TAP TO TRY AGAIN!", 0, 7);
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
        <div className="w-full max-w-[600px]">
          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-3">Kids Games</p>
          <h1 className="text-4xl font-black text-white mb-1">Bradley&apos;s Forest Run</h1>
          <p className="text-zinc-500 mb-6">Jump over logs · collect coins · escape the bear!</p>

          <div className="w-full cursor-pointer select-none" style={{ aspectRatio: "2/1" }} onClick={act}>
            <canvas ref={canvasRef} width={CW} height={CH} className="w-full h-full rounded-2xl shadow-2xl" />
          </div>

          <button onClick={act}
            className="mt-5 w-full py-5 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-white font-black text-2xl shadow-lg">
            {phase === "idle" ? "🌲 START!" : phase === "dead" ? "🔄 TRY AGAIN!" : "⬆️ JUMP!"}
          </button>

          <p className="text-center text-zinc-600 text-sm mt-3">Press SPACE or tap to jump</p>
        </div>
      </main>
    </>
  );
}
