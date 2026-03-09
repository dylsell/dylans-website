"use client";

import Link from "next/link";
import Nav from "../../components/Nav";
import { useState, useRef, useEffect, useCallback } from "react";

const GOALS_TO_WIN = 5;
const NET_WIDTH = 100;
const NET_HEIGHT = 32;
const PLAYER_SIZE = 52;
const GOALIE_W = 38;
const GOALIE_H = 34;

function getPlayerSpeed(goals: number) {
  return [155, 190, 230, 275, 325][Math.min(goals, 4)];
}
function getGoalieSpeed(goals: number) {
  return [55, 90, 130, 175, 230][Math.min(goals, 4)];
}

// ── Audio ────────────────────────────────────────────────────────────────────
function makeAudio() {
  try { return new AudioContext(); } catch { return null; }
}

function playGoalHorn(ac: AudioContext) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(310, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(460, ac.currentTime + 0.45);
  osc.frequency.linearRampToValueAtTime(440, ac.currentTime + 1.1);
  gain.gain.setValueAtTime(0.14, ac.currentTime);
  gain.gain.setValueAtTime(0.14, ac.currentTime + 0.9);
  gain.gain.linearRampToValueAtTime(0, ac.currentTime + 1.2);
  osc.start(); osc.stop(ac.currentTime + 1.2);
}

function playMiss(ac: AudioContext) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(90, ac.currentTime + 0.25);
  gain.gain.setValueAtTime(0.08, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.25);
  osc.start(); osc.stop(ac.currentTime + 0.25);
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
  const u = new SpeechSynthesisUtterance(phrases[Math.floor(Math.random() * phrases.length)]);
  u.rate = 0.9; u.pitch = 1.2;
  window.speechSynthesis.speak(u);
}

// ── Goal particles ───────────────────────────────────────────────────────────
const PARTICLE_COLORS = ["#FF0000","#FFCC00","#4499FF","#ffffff","#FF6B6B","#FFE44D"];
interface Particle { id: number; color: string; tx: string; ty: string; size: number; dur: number }

function GoalParticles({ origin }: { origin: { x: number; y: number } }) {
  const particles: Particle[] = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    tx: `${(Math.random() - 0.5) * 220}px`,
    ty: `${-Math.random() * 180 - 30}px`,
    size: 6 + Math.random() * 10,
    dur: 0.5 + Math.random() * 0.5,
  }));
  return (
    <div className="absolute pointer-events-none" style={{ left: origin.x, top: origin.y, zIndex: 40 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: Math.random() > 0.4 ? "50%" : "2px",
          // @ts-expect-error CSS custom properties
          "--tx": p.tx,
          "--ty": p.ty,
          animation: `particleOut ${p.dur}s ease-out forwards`,
          transform: "translate(-50%, -50%)",
        }} />
      ))}
    </div>
  );
}

// ── Player avatar ────────────────────────────────────────────────────────────
function PlayerAvatar({ size }: { size: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
      {err ? (
        <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, background: "#0A2D6B" }}>🧍</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/bradley/hoodie.png" alt="Bradley" width={size} height={size}
          style={{ objectFit: "cover", objectPosition: "center top", width: "100%", height: "100%" }}
          onError={() => setErr(true)} />
      )}
    </div>
  );
}

// ── Hockey net (drawn with CSS) ───────────────────────────────────────────────
function HockeyNet({ flash }: { flash: boolean }) {
  return (
    <div style={{
      position: "relative",
      width: NET_WIDTH,
      height: NET_HEIGHT + 10,
      flexShrink: 0,
    }}>
      {/* Back of net */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: NET_HEIGHT,
        border: "3px solid #cc0000",
        borderBottom: "none",
        borderRadius: "4px 4px 0 0",
        background: flash
          ? "rgba(255,0,0,0.35)"
          : "rgba(255,255,255,0.06)",
        transition: "background 0.08s",
        overflow: "hidden",
      }}>
        {/* Net grid lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`v${i}`} style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${(i + 1) * (100 / 6)}%`,
            width: 1, background: "rgba(255,255,255,0.2)",
          }} />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`h${i}`} style={{
            position: "absolute", left: 0, right: 0,
            top: `${(i + 1) * 25}%`,
            height: 1, background: "rgba(255,255,255,0.2)",
          }} />
        ))}
        {/* Red-light flash overlay */}
        {flash && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(255,30,30,0.6)",
            borderRadius: 2,
          }} />
        )}
      </div>
      {/* Post tops */}
      <div style={{
        position: "absolute", bottom: NET_HEIGHT - 1, left: -2, right: -2, height: 5,
        background: "#cc0000", borderRadius: 3,
      }} />
    </div>
  );
}

// ── Crowd silhouettes ─────────────────────────────────────────────────────────
function Crowd() {
  const heads = Array.from({ length: 22 }, (_, i) => ({
    x: i * (100 / 22),
    size: 16 + Math.sin(i * 1.7) * 5,
    row: i % 3,
  }));
  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: 54 }}>
      {/* Crowd backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,8,30,0.95) 0%, transparent 100%)" }} />
      {heads.map((h, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${h.x + (h.row === 1 ? 2.2 : 0)}%`,
          top: h.row === 0 ? 2 : h.row === 1 ? 14 : 26,
          width: h.size,
          height: h.size,
          borderRadius: "50% 50% 40% 40%",
          background: "rgba(20,20,40,0.9)",
        }} />
      ))}
      {/* Stand divider */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

// ── Main game ─────────────────────────────────────────────────────────────────
export default function HockeyGame() {
  const [goals, setGoals] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [result, setResult] = useState<"goal" | "miss" | null>(null);
  const [won, setWon] = useState(false);
  const [playerX, setPlayerX] = useState(0);
  const [goalieX, setGoalieX] = useState(0);
  const [goalFlash, setGoalFlash] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [goalParticleOrigin, setGoalParticleOrigin] = useState<{ x: number; y: number } | null>(null);
  const [puck, setPuck] = useState<{ x: number; flying: boolean; shotId: number } | null>(null);

  const gameRef = useRef<HTMLDivElement>(null);
  const playerDirRef = useRef(1);
  const playerXRef = useRef(0);
  const goalieDirRef = useRef(1);
  const goalieXRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const goalsRef = useRef(0);
  const wonRef = useRef(false);
  const shotIdRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  goalsRef.current = goals;
  wonRef.current = won;

  function getAudio() {
    if (!audioRef.current) audioRef.current = makeAudio();
    return audioRef.current;
  }

  // Combined animation loop: player + goalie
  useEffect(() => {
    function animate(time: number) {
      if (wonRef.current) return;
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const container = gameRef.current;
      if (container) {
        const containerW = container.clientWidth;

        // Player
        const maxPlayerX = containerW - PLAYER_SIZE - 12;
        const pSpeed = getPlayerSpeed(goalsRef.current);
        let nextP = playerXRef.current + playerDirRef.current * pSpeed * dt;
        if (nextP >= maxPlayerX) { nextP = maxPlayerX; playerDirRef.current = -1; }
        else if (nextP <= 8) { nextP = 8; playerDirRef.current = 1; }
        playerXRef.current = nextP;
        setPlayerX(nextP);

        // Goalie (moves within net bounds)
        const netLeft = containerW / 2 - NET_WIDTH / 2;
        const goalieMin = netLeft + 4;
        const goalieMax = netLeft + NET_WIDTH - GOALIE_W - 4;
        const gSpeed = getGoalieSpeed(goalsRef.current);
        let nextG = goalieXRef.current + goalieDirRef.current * gSpeed * dt;
        if (nextG >= goalieMax) { nextG = goalieMax; goalieDirRef.current = -1; }
        else if (nextG <= goalieMin) { nextG = goalieMin; goalieDirRef.current = 1; }
        goalieXRef.current = nextG;
        setGoalieX(nextG);
      }
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); lastTimeRef.current = null; };
  }, [won]);

  // Two-frame puck trigger
  useEffect(() => {
    if (!puck || puck.flying) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      setPuck(p => p ? { ...p, flying: true } : null);
    }));
    return () => cancelAnimationFrame(id);
  }, [puck?.shotId]); // eslint-disable-line react-hooks/exhaustive-deps

  const shoot = useCallback(() => {
    if (shooting || won) return;
    const game = gameRef.current;
    if (!game) return;
    const ac = getAudio();

    const containerW = game.clientWidth;
    const playerCenterX = playerXRef.current + PLAYER_SIZE / 2;
    const netLeft = containerW / 2 - NET_WIDTH / 2;
    const netRight = containerW / 2 + NET_WIDTH / 2;

    const inNet = playerCenterX >= netLeft - 8 && playerCenterX <= netRight + 8;
    const goalieCenterX = goalieXRef.current + GOALIE_W / 2;
    const goalieBlocks = Math.abs(playerCenterX - goalieCenterX) < GOALIE_W / 2 + 6;
    const isGoal = inNet && !goalieBlocks;

    shotIdRef.current++;
    setShooting(true);
    setResult(null);
    setPuck({ x: playerCenterX, flying: false, shotId: shotIdRef.current });

    setTimeout(() => {
      setResult(isGoal ? "goal" : "miss");
      if (isGoal) {
        if (ac) playGoalHorn(ac);
        speakGoal();
        setGoalFlash(true);
        setShaking(true);
        setGoalParticleOrigin({ x: containerW / 2, y: 80 });
        setTimeout(() => setGoalFlash(false), 900);
        setTimeout(() => setShaking(false), 500);
        setTimeout(() => setGoalParticleOrigin(null), 1200);
        setGoals(prev => {
          const next = prev + 1;
          if (next >= GOALS_TO_WIN) setTimeout(() => setWon(true), 1300);
          return next;
        });
      } else {
        if (ac) playMiss(ac);
      }
      setTimeout(() => { setShooting(false); setResult(null); setPuck(null); }, 980);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shooting, won]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") { e.preventDefault(); shoot(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shoot]);

  function reset() {
    setGoals(0); setResult(null); setShooting(false); setWon(false);
    setGoalFlash(false); setShaking(false); setPuck(null); setGoalParticleOrigin(null);
    playerXRef.current = 0; setPlayerX(0); playerDirRef.current = 1;
    goalieXRef.current = 0; setGoalieX(0); goalieDirRef.current = 1;
    lastTimeRef.current = null;
  }

  return (
    <>
      <Nav />
      <main
        className="min-h-screen px-4 pt-24 pb-6 flex flex-col"
        style={{ background: "linear-gradient(180deg, #000E2F 0%, #002060 60%, #000E2F 100%)" }}
      >
        <div className="max-w-lg mx-auto w-full flex flex-col flex-1">
          <Link href="/kids" className="text-blue-400 hover:text-white text-sm font-semibold transition-colors mb-4 inline-flex items-center gap-1">
            ← Games
          </Link>

          {won ? (
            /* ── WIN SCREEN ── */
            <div className="flex flex-col items-center text-center py-8">
              <div className="text-7xl mb-2" style={{ animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>⚡</div>
              <h1 className="text-7xl font-black mb-1 tracking-tight" style={{ color: "#fff", textShadow: "0 0 40px #4488FF, 0 0 80px #2255CC" }}>
                GOAL!
              </h1>
              <p className="text-yellow-400 font-black text-2xl mb-6 tracking-widest">LIGHTNING WIN!</p>
              <div style={{
                width: 120, height: 120, borderRadius: "50%",
                border: "4px solid #FFCC00",
                boxShadow: "0 0 30px rgba(255,200,0,0.5), 0 0 60px rgba(255,200,0,0.2)",
                overflow: "hidden", marginBottom: 16,
              }}>
                <PlayerAvatar size={120} />
              </div>
              <p className="text-white font-black text-xl mb-1">Bradley Sellberg</p>
              <p className="text-blue-300 mb-2">scored {GOALS_TO_WIN} goals!</p>
              <div className="flex gap-1 mb-8">
                {Array.from({ length: GOALS_TO_WIN }).map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl" style={{ animation: `popIn 0.4s ${i * 0.1}s cubic-bezier(0.34,1.56,0.64,1) both` }}>⚡</span>
                ))}
              </div>
              <button onClick={reset} className="font-black text-xl px-10 py-4 rounded-2xl transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #FFCC00, #FFB300)", color: "#001040", boxShadow: "0 4px 24px rgba(255,200,0,0.4)" }}>
                Play Again ⚡
              </button>
            </div>
          ) : (
            <>
              {/* ── SCOREBOARD ── */}
              <div className="rounded-2xl p-3 mb-3 flex items-center justify-between"
                style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-3xl" style={{ filter: "drop-shadow(0 0 8px #4499FF)" }}>⚡</span>
                  <div>
                    <p className="text-yellow-400 font-black text-xs tracking-widest leading-none">TAMPA BAY</p>
                    <p className="text-white font-black text-xs tracking-widest leading-none mt-0.5">LIGHTNING</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-zinc-600 text-xs font-bold tracking-widest mb-0.5">GOALS</p>
                  <p className="font-black leading-none" style={{ fontSize: 40, color: "#fff", textShadow: goals > 0 ? "0 0 20px rgba(68,153,255,0.8)" : "none" }}>
                    {goals}<span style={{ color: "#333", fontSize: 20, fontWeight: 400 }}>/{GOALS_TO_WIN}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-blue-300 font-black text-xs tracking-widest leading-none">BRADLEY</p>
                    <p className="text-white font-black text-xs tracking-widest leading-none mt-0.5">SELLBERG</p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid #4499FF", overflow: "hidden", boxShadow: "0 0 12px rgba(68,153,255,0.5)" }}>
                    <PlayerAvatar size={40} />
                  </div>
                </div>
              </div>

              {/* ── RINK ── */}
              <div
                ref={gameRef}
                className="relative rounded-3xl overflow-hidden"
                style={{
                  minHeight: 320, flex: 1,
                  background: "linear-gradient(180deg, #C8E8F8 0%, #E0F4FD 45%, #C8E8F8 100%)",
                  boxShadow: goalFlash
                    ? "0 0 0 4px #FF0000, 0 0 80px 20px rgba(255,0,0,0.5)"
                    : "0 0 40px rgba(0,40,104,0.6), inset 0 0 60px rgba(180,220,240,0.3)",
                  transition: "box-shadow 0.08s",
                  animation: shaking ? "screenShake 0.45s ease" : undefined,
                }}
              >
                {/* Crowd */}
                <Crowd />

                {/* Goal particles */}
                {goalParticleOrigin && <GoalParticles origin={goalParticleOrigin} />}

                {/* Ice markings */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-0 right-0" style={{ top: "50%", height: 2, background: "rgba(220,30,30,0.3)" }} />
                  <div className="absolute left-0 right-0" style={{ top: "30%", height: 2, background: "rgba(30,100,220,0.25)" }} />
                  <div className="absolute left-0 right-0" style={{ top: "72%", height: 2, background: "rgba(30,100,220,0.25)" }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: 90, height: 90, border: "2px solid rgba(220,30,30,0.25)" }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl select-none" style={{ opacity: 0.06 }}>⚡</div>
                  <div className="absolute rounded-b-full"
                    style={{ top: 76, left: "26%", width: "48%", height: 30, background: "rgba(30,100,220,0.1)", border: "2px solid rgba(220,30,30,0.3)" }} />
                </div>

                {/* Net — drawn with CSS */}
                <div className="absolute flex flex-col items-center" style={{ top: 52, left: "50%", transform: "translateX(-50%)", zIndex: 5 }}>
                  <HockeyNet flash={goalFlash} />
                </div>

                {/* Goalie */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: goalieX, top: 58, width: GOALIE_W, zIndex: 6, willChange: "left" }}
                >
                  <div style={{
                    width: GOALIE_W, height: GOALIE_H,
                    background: "linear-gradient(180deg, #002868 0%, #0A3DBF 100%)",
                    borderRadius: "6px 6px 0 0",
                    border: "2px solid #FFCC00",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    🧤
                  </div>
                </div>

                {/* Puck */}
                {puck && (
                  <div className="pointer-events-none" style={{
                    position: "absolute",
                    left: puck.x,
                    bottom: puck.flying ? "88%" : "22%",
                    transform: "translate(-50%, 50%)",
                    transition: puck.flying ? "bottom 500ms cubic-bezier(0.1,0,0.4,1)" : "none",
                    zIndex: 10,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "radial-gradient(circle at 35% 35%, #666, #0a0a0a)",
                      border: "1.5px solid #444",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.7)",
                    }} />
                    {puck.flying && (
                      <div style={{
                        position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                        width: 4, height: 50,
                        background: "linear-gradient(to bottom, rgba(200,230,255,0.7), transparent)",
                        borderRadius: 2,
                      }} />
                    )}
                  </div>
                )}

                {/* Result flash */}
                {result && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 30 }}>
                    <p className="font-black" style={{
                      fontSize: 44,
                      color: result === "goal" ? "#CC0000" : "#555",
                      textShadow: result === "goal" ? "0 0 20px rgba(255,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.2)" : "none",
                      animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
                    }}>
                      {result === "goal" ? "🚨 GOAL!" : "🧤 SAVED!"}
                    </p>
                  </div>
                )}

                {/* Bradley */}
                <div className="absolute bottom-4 flex flex-col items-center gap-1"
                  style={{ left: playerX, width: PLAYER_SIZE, zIndex: 5, willChange: "left" }}>
                  <div style={{
                    width: PLAYER_SIZE, height: PLAYER_SIZE, borderRadius: "50%",
                    border: "3px solid #002868",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    overflow: "hidden",
                  }}>
                    <PlayerAvatar size={PLAYER_SIZE} />
                  </div>
                  <span className="font-black text-xs tracking-wider" style={{ color: "#002868" }}>BRADLEY</span>
                </div>
              </div>

              {/* ── SHOOT BUTTON ── */}
              <button
                onClick={shoot}
                disabled={shooting}
                className="mt-3 w-full font-black text-2xl py-5 rounded-2xl transition-all active:scale-[0.97] tracking-wide select-none"
                style={{
                  background: shooting ? "rgba(0,10,30,0.8)" : "linear-gradient(135deg, #002868 0%, #0A3DBF 50%, #002868 100%)",
                  color: shooting ? "#334" : "white",
                  border: "2px solid rgba(100,160,255,0.2)",
                  boxShadow: shooting ? "none" : "0 4px 24px rgba(10,60,200,0.5)",
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
                      {goals >= 4 ? "MAX SPEED" : "GOALIE SPEEDS UP"}
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
