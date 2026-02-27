"use client";

import Link from "next/link";
import Nav from "../../components/Nav";
import { useState, useRef, useEffect, useCallback } from "react";

const GOALS_TO_WIN = 5;
const NET_WIDTH = 88;
const PLAYER_SIZE = 52;

// Player skating speed (px/s) — increases each goal
function getSpeed(goals: number): number {
  return [160, 195, 235, 275, 320][Math.min(goals, 4)];
}

// ── Audio ──────────────────────────────────────────────────────────────────
function getAudioCtx(): AudioContext | null {
  try {
    return new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  } catch {
    return null;
  }
}

function playGoalHorn() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  // Classic goal horn: sawtooth wave, rising pitch, sustain
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(310, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(460, ctx.currentTime + 0.45);
  osc.frequency.setValueAtTime(460, ctx.currentTime + 0.45);
  osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.1);
  gain.gain.setValueAtTime(0.14, ctx.currentTime);
  gain.gain.setValueAtTime(0.14, ctx.currentTime + 0.9);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  osc.start();
  osc.stop(ctx.currentTime + 1.2);
}

function playMissSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
  osc.start();
  osc.stop(ctx.currentTime + 0.22);
}

function speakGoal() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const phrases = [
    "Goal! Bradley scores for Tampa Bay!",
    "He shoots, he scores! Go Lightning!",
    "Bradley Sellberg scores again! The crowd goes wild!",
    "Tampa Bay Lightning goal!",
    "What a shot Bradley! Lightning win!",
  ];
  const u = new SpeechSynthesisUtterance(
    phrases[Math.floor(Math.random() * phrases.length)]
  );
  u.rate = 0.9;
  u.pitch = 1.2;
  window.speechSynthesis.speak(u);
}

// ── Player avatar with photo fallback ─────────────────────────────────────
function PlayerAvatar({ size, className }: { size: number; className?: string }) {
  const [err, setErr] = useState(false);
  return (
    <div
      className={className}
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}
    >
      {err ? (
        <div
          style={{
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.55,
            background: "#0A2D6B",
          }}
        >
          🧍
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/bradley.jpg"
          alt="Bradley"
          width={size}
          height={size}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          onError={() => setErr(true)}
        />
      )}
    </div>
  );
}

// ── Main game ──────────────────────────────────────────────────────────────
export default function HockeyGame() {
  const [goals, setGoals] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [result, setResult] = useState<"goal" | "miss" | null>(null);
  const [won, setWon] = useState(false);
  const [playerX, setPlayerX] = useState(0);
  const [goalFlash, setGoalFlash] = useState(false);
  // Puck: tracks where it starts (player pos) and ends (net center) for animation
  const [puck, setPuck] = useState<{ fromX: number; toX: number } | null>(null);

  const gameRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef(1);
  const playerXRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const goalsRef = useRef(0);
  const wonRef = useRef(false);
  goalsRef.current = goals;
  wonRef.current = won;

  // Player skating animation loop
  useEffect(() => {
    function animate(time: number) {
      if (wonRef.current) return;
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const container = gameRef.current;
      if (container) {
        const maxX = container.clientWidth - PLAYER_SIZE - 12;
        const speed = getSpeed(goalsRef.current);
        let nextX = playerXRef.current + dirRef.current * speed * dt;
        if (nextX >= maxX) { nextX = maxX; dirRef.current = -1; }
        else if (nextX <= 8) { nextX = 8; dirRef.current = 1; }
        playerXRef.current = nextX;
        setPlayerX(nextX);
      }
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = null;
    };
  }, [won]);

  const shoot = useCallback(() => {
    if (shooting || won) return;
    const game = gameRef.current;
    if (!game) return;

    const containerWidth = game.clientWidth;
    // Player center X at moment of shot
    const playerCenterX = playerXRef.current + PLAYER_SIZE / 2;
    // Net is fixed at center top
    const netLeft = containerWidth / 2 - NET_WIDTH / 2;
    const netRight = containerWidth / 2 + NET_WIDTH / 2;
    const netCenterX = containerWidth / 2;

    const isGoal = playerCenterX >= netLeft - 10 && playerCenterX <= netRight + 10;

    setShooting(true);
    setResult(null);
    setPuck({ fromX: playerCenterX, toX: netCenterX });

    setTimeout(() => {
      const r = isGoal ? "goal" : "miss";
      setResult(r);
      if (isGoal) {
        playGoalHorn();
        speakGoal();
        setGoalFlash(true);
        setTimeout(() => setGoalFlash(false), 900);
        setGoals((prev) => {
          const next = prev + 1;
          if (next >= GOALS_TO_WIN) setTimeout(() => setWon(true), 1300);
          return next;
        });
      } else {
        playMissSound();
      }
      setTimeout(() => { setShooting(false); setResult(null); setPuck(null); }, 980);
    }, 280);
  }, [shooting, won]);

  function reset() {
    setGoals(0); setResult(null); setShooting(false);
    setWon(false); setGoalFlash(false); setPuck(null);
    playerXRef.current = 0; setPlayerX(0);
    dirRef.current = 1; lastTimeRef.current = null;
  }

  return (
    <>
      <Nav />
      <main
        className="min-h-screen px-4 pt-24 pb-6 flex flex-col"
        style={{ background: "linear-gradient(180deg, #000E2F 0%, #002060 60%, #000E2F 100%)" }}
      >
        <div className="max-w-lg mx-auto w-full flex flex-col flex-1">
          <Link
            href="/kids"
            className="text-blue-400 hover:text-white text-sm font-semibold transition-colors mb-4 inline-flex items-center gap-1"
          >
            ← Games
          </Link>

          {won ? (
            /* ── WIN SCREEN ── */
            <div className="flex flex-col items-center text-center py-10">
              <div className="text-7xl mb-2">⚡</div>
              <h1
                className="text-7xl font-black mb-1 tracking-tight"
                style={{ color: "#fff", textShadow: "0 0 40px #4488FF, 0 0 80px #2255CC" }}
              >
                GOAL!
              </h1>
              <p className="text-yellow-400 font-black text-2xl mb-6 tracking-widest">
                LIGHTNING WIN!
              </p>

              <div
                className="mb-4"
                style={{
                  width: 120, height: 120, borderRadius: "50%",
                  border: "4px solid #FFCC00",
                  boxShadow: "0 0 30px rgba(255,200,0,0.5)",
                  overflow: "hidden",
                }}
              >
                <PlayerAvatar size={120} />
              </div>

              <p className="text-white font-black text-xl mb-1">Bradley Sellberg</p>
              <p className="text-blue-300 mb-2">scored {GOALS_TO_WIN} goals!</p>
              <div className="flex gap-1 mb-8">
                {Array.from({ length: GOALS_TO_WIN }).map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">⚡</span>
                ))}
              </div>

              <button
                onClick={reset}
                className="font-black text-xl px-10 py-4 rounded-2xl transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #FFCC00, #FFB300)",
                  color: "#001040",
                  boxShadow: "0 4px 24px rgba(255,200,0,0.4)",
                }}
              >
                Play Again ⚡
              </button>
            </div>
          ) : (
            <>
              {/* ── SCOREBOARD ── */}
              <div
                className="rounded-2xl p-3 mb-3 flex items-center justify-between"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {/* Team */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-3xl"
                    style={{ filter: "drop-shadow(0 0 8px #4499FF)" }}
                  >
                    ⚡
                  </span>
                  <div>
                    <p className="text-yellow-400 font-black text-xs tracking-widest leading-none">
                      TAMPA BAY
                    </p>
                    <p className="text-white font-black text-xs tracking-widest leading-none mt-0.5">
                      LIGHTNING
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="text-center">
                  <p className="text-zinc-600 text-xs font-bold tracking-widest mb-0.5">
                    GOALS
                  </p>
                  <p
                    className="font-black leading-none tabular-nums"
                    style={{
                      fontSize: 40,
                      color: "#fff",
                      fontVariantNumeric: "tabular-nums",
                      textShadow: goals > 0 ? "0 0 20px rgba(68,153,255,0.8)" : "none",
                    }}
                  >
                    {goals}
                    <span style={{ color: "#333", fontSize: 20, fontWeight: 400 }}>
                      /{GOALS_TO_WIN}
                    </span>
                  </p>
                </div>

                {/* Player */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-blue-300 font-black text-xs tracking-widest leading-none">
                      BRADLEY
                    </p>
                    <p className="text-white font-black text-xs tracking-widest leading-none mt-0.5">
                      SELLBERG
                    </p>
                  </div>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      border: "2px solid #4499FF",
                      overflow: "hidden",
                      boxShadow: "0 0 12px rgba(68,153,255,0.5)",
                    }}
                  >
                    <PlayerAvatar size={40} />
                  </div>
                </div>
              </div>

              {/* ── RINK ── */}
              <div
                ref={gameRef}
                className="relative rounded-3xl overflow-hidden"
                style={{
                  minHeight: 310,
                  flex: 1,
                  background: "linear-gradient(180deg, #D6EFFA 0%, #E8F6FD 50%, #D6EFFA 100%)",
                  boxShadow: goalFlash
                    ? "0 0 0 4px #FF0000, 0 0 80px 20px rgba(255,0,0,0.6)"
                    : "0 0 40px rgba(0,40,104,0.6), inset 0 0 60px rgba(180,220,240,0.3)",
                  transition: "box-shadow 0.08s",
                }}
              >
                {/* Red light overlay on goal */}
                {goalFlash && (
                  <div
                    className="absolute inset-0 z-20 pointer-events-none"
                    style={{ background: "rgba(220,0,0,0.25)", animation: "pulse 0.15s ease-in-out" }}
                  />
                )}

                {/* Ice markings */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Center red line */}
                  <div
                    className="absolute left-0 right-0"
                    style={{ top: "50%", height: 2, background: "rgba(220,30,30,0.35)" }}
                  />
                  {/* Blue lines */}
                  <div
                    className="absolute left-0 right-0"
                    style={{ top: "28%", height: 2, background: "rgba(30,100,220,0.3)" }}
                  />
                  <div
                    className="absolute left-0 right-0"
                    style={{ top: "72%", height: 2, background: "rgba(30,100,220,0.3)" }}
                  />
                  {/* Center circle */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: 90, height: 90, border: "2px solid rgba(220,30,30,0.3)" }}
                  />
                  {/* Lightning at center */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl select-none"
                    style={{ opacity: 0.07 }}
                  >
                    ⚡
                  </div>
                  {/* Goal crease */}
                  <div
                    className="absolute rounded-b-full"
                    style={{
                      top: 72, left: "28%", width: "44%", height: 28,
                      background: "rgba(30,100,220,0.12)",
                      border: "2px solid rgba(220,30,30,0.35)",
                    }}
                  />
                </div>

                {/* Net — fixed center top */}
                <div
                  className="absolute top-3 text-6xl leading-none select-none"
                  style={{
                    left: "50%",
                    transform: "translateX(-50%)",
                    filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))",
                  }}
                >
                  🥅
                </div>

                {/* Puck — travels from player toward net */}
                {puck && (
                  <div
                    className="pointer-events-none"
                    style={{
                      position: "absolute",
                      left: shooting ? puck.toX : puck.fromX,
                      bottom: shooting ? "83%" : "20%",
                      transform: "translate(-50%, 50%)",
                      transition: shooting
                        ? "bottom 280ms cubic-bezier(0.4,0,1,1), left 280ms cubic-bezier(0.4,0,1,1)"
                        : "none",
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 20, height: 20,
                        borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 35%, #555, #111)",
                        border: "1.5px solid #333",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                      }}
                    />
                    {shooting && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 3,
                          height: 32,
                          background: "linear-gradient(to bottom, rgba(180,220,255,0.5), transparent)",
                          borderRadius: 2,
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Result flash */}
                {result && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 30 }}
                  >
                    <p
                      className="font-black"
                      style={{
                        fontSize: 44,
                        color: result === "goal" ? "#CC0000" : "#444",
                        textShadow: result === "goal"
                          ? "0 0 20px rgba(255,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.2)"
                          : "none",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {result === "goal" ? "🚨 GOAL!" : "❌ MISS!"}
                    </p>
                  </div>
                )}

                {/* Bradley — moves left and right */}
                <div
                  className="absolute bottom-4 flex flex-col items-center gap-1"
                  style={{ left: playerX, width: PLAYER_SIZE, zIndex: 5, willChange: "left" }}
                >
                  <div
                    style={{
                      width: PLAYER_SIZE, height: PLAYER_SIZE, borderRadius: "50%",
                      border: "3px solid #002868",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                      overflow: "hidden",
                    }}
                  >
                    <PlayerAvatar size={PLAYER_SIZE} />
                  </div>
                  <span
                    className="font-black text-xs tracking-wider"
                    style={{ color: "#002868" }}
                  >
                    BRADLEY
                  </span>
                </div>
              </div>

              {/* ── SHOOT BUTTON ── */}
              <button
                onClick={shoot}
                disabled={shooting}
                className="mt-3 w-full font-black text-2xl py-5 rounded-2xl transition-all active:scale-[0.97] tracking-wide select-none"
                style={{
                  background: shooting
                    ? "rgba(0,10,30,0.8)"
                    : "linear-gradient(135deg, #002868 0%, #0A3DBF 50%, #002868 100%)",
                  color: shooting ? "#334" : "white",
                  border: "2px solid rgba(100,160,255,0.2)",
                  boxShadow: shooting ? "none" : "0 4px 24px rgba(10,60,200,0.5), 0 0 0 1px rgba(100,160,255,0.1)",
                  letterSpacing: "0.05em",
                }}
              >
                {shooting ? "· · ·" : "⚡  SHOOT!"}
              </button>

              {/* Level indicator */}
              <div className="flex items-center justify-center gap-2 mt-2 h-5">
                {goals > 0 && (
                  <>
                    {Array.from({ length: goals }).map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm">⚡</span>
                    ))}
                    <span className="text-blue-500 text-xs font-semibold tracking-widest">
                      {goals >= 4 ? "MAX POWER" : "SPEED UP"}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
