"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Nav from "../../components/Nav";

const CW = 600;
const CH = 300;
const GY = 225; // ground Y
const BX = 90;  // bradley fixed X
const BW = 52;
const BH = 80;
const GRAV = 0.58;
const JVEL = -13;

type Phase = "idle" | "running" | "dead";
interface Log { x: number; w: number; h: number }
interface Tree { x: number; h: number; sp: number }

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

function makeTrees(): Tree[] {
  return Array.from({ length: 9 }, (_, i) => ({
    x: i * (CW / 9) + Math.random() * 30,
    h: 50 + Math.random() * 50,
    sp: 0.8 + Math.random() * 1.0,
  }));
}

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
    osc.connect(gain);
    gain.connect(ac.destination);
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
    by: GY - BH,
    vy: 0,
    grounded: true,
    logs: [] as Log[],
    trees: makeTrees(),
    frame: 0,
    speed: 4,
    score: 0,
    best: 0,
    nextLog: 90,
  });

  const act = useCallback(() => {
    // Init audio on first user gesture
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const s = gs.current;
    if (s.phase === "idle") {
      Object.assign(s, {
        phase: "running",
        by: GY - BH, vy: 0, grounded: true,
        logs: [], trees: makeTrees(),
        frame: 0, speed: 4, score: 0, nextLog: 90,
      });
      setPhase("running");
      bloop.current(300, 0.12, "sine", 0.15, 500); // start chime
    } else if (s.phase === "running" && s.grounded) {
      s.vy = JVEL;
      s.grounded = false;
      bloop.current(280, 0.14, "sine", 0.18, 560); // jump bloop
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

      // Sky gradient
      const skyG = ctx.createLinearGradient(0, 0, 0, GY);
      skyG.addColorStop(0, "#5bb8e8");
      skyG.addColorStop(1, "#a8d8a0");
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, CW, GY);

      // Move + draw background trees
      s.trees.forEach(t => {
        if (s.phase === "running") {
          t.x -= t.sp * (s.speed / 4);
          if (t.x + t.h < 0) {
            t.x = CW + 20;
            t.h = 50 + Math.random() * 50;
            t.sp = 0.8 + Math.random() * 1.0;
          }
        }
        const tw = t.h * 0.65;
        // Trunk
        ctx.fillStyle = "#7a4520";
        ctx.fillRect(t.x + tw * 0.38, GY - t.h * 0.48, tw * 0.24, t.h * 0.48);
        // Canopy layers (bottom to top)
        ([ ["#2a6e1a", 0.44, 0.48], ["#35882a", 0.33, 0.72], ["#4aa030", 0.22, 0.92] ] as [string, number, number][]).forEach(([color, r, dy]) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(t.x + tw * 0.5, GY - t.h * dy, tw * r, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Ground
      ctx.fillStyle = "#3a6820";
      ctx.fillRect(0, GY, CW, CH - GY);
      ctx.fillStyle = "#52901e";
      ctx.fillRect(0, GY, CW, 10);

      // Game logic
      if (s.phase === "running") {
        s.frame++;
        s.score = Math.floor(s.frame / 6);
        s.speed = 4 + s.frame / 500;

        // Spawn logs
        s.nextLog--;
        if (s.nextLog <= 0) {
          s.logs.push({ x: CW + 10, w: 28 + Math.random() * 14, h: 24 + Math.random() * 24 });
          s.nextLog = Math.max(52, 92 - s.frame / 80);
        }

        // Move logs
        s.logs = s.logs.map(l => ({ ...l, x: l.x - s.speed })).filter(l => l.x + l.w > 0);

        // Physics
        s.vy += GRAV;
        s.by += s.vy;
        if (s.by >= GY - BH) {
          s.by = GY - BH;
          s.vy = 0;
          s.grounded = true;
        }

        // Footstep bloops — sync with running bob cycle (~21 frames)
        if (s.grounded && s.frame % 21 === 0) {
          bloop.current(140 + Math.random() * 30, 0.07, "triangle", 0.08);
        }

        // Collision (generous hitbox for 4yo)
        const bL = BX + 8, bR = BX + BW - 8;
        const bB = s.by + BH - 8;
        for (const l of s.logs) {
          if (bR > l.x + 5 && bL < l.x + l.w - 5 && bB > GY - l.h + 4) {
            s.phase = "dead";
            if (s.score > s.best) s.best = s.score;
            // Death sound — descending wail
            bloop.current(400, 0.5, "sawtooth", 0.2, 60);
            setPhase("dead");
            setScore(s.score);
            setBest(s.best);
            break;
          }
        }

        if (s.frame % 8 === 0) setScore(s.score);
      }

      // Draw logs
      s.logs.forEach(l => {
        const lg = ctx.createLinearGradient(l.x, 0, l.x + l.w, 0);
        lg.addColorStop(0, "#7B3B11");
        lg.addColorStop(0.5, "#A05525");
        lg.addColorStop(1, "#7B3B11");
        ctx.fillStyle = lg;
        ctx.fillRect(l.x, GY - l.h, l.w, l.h);
        ctx.strokeStyle = "#5a2b08";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(l.x + l.w / 2, GY - l.h, l.w / 2 - 1, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(l.x + l.w / 2, GY, l.w / 2 - 1, 5, 0, 0, Math.PI);
        ctx.stroke();
      });

      // Bear chasing from the left
      const bearBob = Math.sin(s.frame * 0.18) * 4;
      ctx.font = "44px serif";
      ctx.fillText("🐻", 16, GY - 2 + bearBob);

      // Bradley — shadow first
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(BX + BW / 2, GY + 5, BW * 0.45, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bradley sprite (clipped to rounded rect)
      const bob = s.phase === "running" ? Math.sin(s.frame * 0.3) * 2.5 : 0;
      const by = s.by + bob;
      ctx.save();
      rrect(ctx, BX, by, BW, BH, 8);
      ctx.clip();
      if (bradleyImg.current) {
        ctx.drawImage(bradleyImg.current, BX, by, BW, BH);
      } else {
        ctx.fillStyle = "#f9c784";
        ctx.fillRect(BX, by, BW, BH);
      }
      ctx.restore();

      // White border around sprite
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      rrect(ctx, BX, by, BW, BH, 8);
      ctx.stroke();

      // HUD score
      if (s.phase === "running") {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        rrect(ctx, 10, 10, 108, 34, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 15px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`🏃 ${s.score}m`, 20, 32);
      }

      // Start overlay
      if (s.phase === "idle") {
        ctx.fillStyle = "rgba(0,35,0,0.68)";
        ctx.fillRect(0, 0, CW, CH);
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.fillText("🌲 Bradley's Forest Run! 🌲", CW / 2, 68);
        ctx.fillStyle = "#b8f0b8";
        ctx.font = "17px system-ui, sans-serif";
        ctx.fillText("Jump over logs to escape the bear! 🐻", CW / 2, 108);
        const pulse = 0.96 + Math.sin(Date.now() / 350) * 0.04;
        ctx.save();
        ctx.translate(CW / 2, 178);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "#4ade80";
        rrect(ctx, -90, -22, 180, 44, 14);
        ctx.fill();
        ctx.fillStyle = "#14532d";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText("🌿 TAP TO START!", 0, 7);
        ctx.restore();
        ctx.textAlign = "left";
      }

      // Dead overlay
      if (s.phase === "dead") {
        ctx.fillStyle = "rgba(50,0,0,0.72)";
        ctx.fillRect(0, 0, CW, CH);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff7070";
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText("The bear got you! 🐻", CW / 2, 65);
        ctx.fillStyle = "white";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.fillText(`You ran ${s.score}m!`, CW / 2, 115);
        if (s.best > 0) {
          ctx.fillStyle = "#FFD700";
          ctx.font = "18px system-ui, sans-serif";
          ctx.fillText(`Best: ${s.best}m`, CW / 2, 150);
        }
        const pulse = 0.96 + Math.sin(Date.now() / 350) * 0.04;
        ctx.save();
        ctx.translate(CW / 2, 205);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "#fb923c";
        rrect(ctx, -100, -22, 200, 44, 12);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 19px system-ui, sans-serif";
        ctx.fillText("🔄 TAP TO TRY AGAIN!", 0, 7);
        ctx.restore();
        ctx.textAlign = "left";
      }

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        act();
      }
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
          <p className="text-zinc-500 mb-6">Jump over logs to escape the bear!</p>

          <div
            className="w-full cursor-pointer select-none"
            style={{ aspectRatio: "2/1" }}
            onClick={act}
          >
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className="w-full h-full rounded-2xl shadow-2xl"
            />
          </div>

          <button
            onClick={act}
            className="mt-5 w-full py-5 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-white font-black text-2xl shadow-lg"
          >
            {phase === "idle" ? "🌲 START!" : phase === "dead" ? "🔄 TRY AGAIN!" : "⬆️ JUMP!"}
          </button>

          <p className="text-center text-zinc-600 text-sm mt-3">Press SPACE or tap to jump</p>
        </div>
      </main>
    </>
  );
}
