"use client";

import Link from "next/link";
import Nav from "../../components/Nav";
import { useState, useRef, useEffect, useCallback } from "react";

const GOALS_TO_WIN = 5;
const NET_WIDTH = 80; // approximate px width of 🥅 at text-6xl

// Pixels per second — speeds up as goals increase
function getSpeed(goals: number): number {
  const speeds = [140, 170, 200, 230, 265];
  return speeds[Math.min(goals, speeds.length - 1)];
}

function speakGoal() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const phrases = [
    "Goal! Bradley scores!",
    "Score! Great shot Bradley!",
    "Yes! Goal!",
    "He shoots, he scores!",
    "Bradley scores again!",
  ];
  const text = phrases[Math.floor(Math.random() * phrases.length)];
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.pitch = 1.2;
  window.speechSynthesis.speak(u);
}

export default function HockeyGame() {
  const [goals, setGoals] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [result, setResult] = useState<"goal" | "miss" | null>(null);
  const [won, setWon] = useState(false);
  const [netX, setNetX] = useState(0);

  const gameRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef(1);
  const netXRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const goalsRef = useRef(0);
  const wonRef = useRef(false);

  goalsRef.current = goals;
  wonRef.current = won;

  // Animation loop for the moving net
  useEffect(() => {
    function animate(time: number) {
      if (wonRef.current) return;

      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const container = gameRef.current;
      if (container) {
        const maxX = container.clientWidth - NET_WIDTH - 12;
        const speed = getSpeed(goalsRef.current);
        let nextX = netXRef.current + dirRef.current * speed * dt;

        if (nextX >= maxX) {
          nextX = maxX;
          dirRef.current = -1;
        } else if (nextX <= 8) {
          nextX = 8;
          dirRef.current = 1;
        }

        netXRef.current = nextX;
        setNetX(nextX);
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

    const gameRect = game.getBoundingClientRect();
    const gameCenterX = gameRect.left + gameRect.width / 2;
    const netLeft = gameRect.left + netXRef.current;
    const netRight = netLeft + NET_WIDTH;

    // Generous hit zone for a 4-year-old — just needs to be roughly lined up
    const isGoal = gameCenterX >= netLeft - 24 && gameCenterX <= netRight + 24;

    setShooting(true);
    setResult(null);

    // After puck travels up, show result
    setTimeout(() => {
      const r = isGoal ? "goal" : "miss";
      setResult(r);

      if (isGoal) {
        speakGoal();
        setGoals((prev) => {
          const next = prev + 1;
          if (next >= GOALS_TO_WIN) {
            setTimeout(() => setWon(true), 1000);
          }
          return next;
        });
      }

      setTimeout(() => {
        setShooting(false);
        setResult(null);
      }, 950);
    }, 480);
  }, [shooting, won]);

  function reset() {
    setGoals(0);
    setResult(null);
    setShooting(false);
    setWon(false);
    netXRef.current = 0;
    setNetX(0);
    dirRef.current = 1;
    lastTimeRef.current = null;
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-6 pt-28 pb-8 flex flex-col">
        <div className="max-w-lg mx-auto w-full flex flex-col flex-1">
          <Link
            href="/kids"
            className="text-zinc-500 hover:text-white text-sm transition-colors mb-6"
          >
            ← Games
          </Link>

          {won ? (
            /* Win screen */
            <div className="text-center py-16">
              <div className="text-8xl mb-4">🏆</div>
              <h1 className="text-6xl font-black text-white mb-3">5 GOALS!</h1>
              <p className="text-indigo-400 text-2xl font-bold mb-2">
                Bradley wins!
              </p>
              <p className="text-zinc-500 mb-10">He shoots, he scores!</p>
              <button
                onClick={reset}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xl px-10 py-4 rounded-2xl transition-colors"
              >
                Play again
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">
                    Hockey
                  </p>
                  <h1 className="text-4xl font-black text-white leading-tight">
                    Score the<br />Goal!
                  </h1>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 text-sm mb-1">Goals</p>
                  <p className="text-white font-black text-5xl leading-none">
                    {goals}
                    <span className="text-zinc-600 font-normal text-xl">
                      /{GOALS_TO_WIN}
                    </span>
                  </p>
                  {goals > 0 && (
                    <p className="text-indigo-400 text-xs mt-1 font-semibold">
                      {goals >= 4 ? "🔥 Max speed!" : "Getting faster!"}
                    </p>
                  )}
                </div>
              </div>

              {/* Game area */}
              <div
                ref={gameRef}
                className="relative bg-zinc-900 rounded-3xl overflow-hidden select-none"
                style={{ height: 340 }}
              >
                {/* Ice rink markings */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-300" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-blue-300" />
                  <div className="absolute top-0 left-1/2 bottom-0 w-px bg-blue-300" />
                </div>

                {/* Moving net */}
                <div
                  className="absolute top-4 text-6xl leading-none"
                  style={{ left: netX, willChange: "transform" }}
                >
                  🥅
                </div>

                {/* Dashed aim line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-white/10 pointer-events-none" />

                {/* Puck */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 text-2xl pointer-events-none"
                  style={{
                    bottom: shooting ? "82%" : "22%",
                    transition: shooting ? "bottom 480ms ease-in" : "none",
                    opacity: shooting || result ? 1 : 0,
                  }}
                >
                  ⚫
                </div>

                {/* Result flash */}
                {result && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <p
                      className={`text-5xl font-black drop-shadow-xl ${
                        result === "goal" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {result === "goal" ? "🚨 GOAL!" : "😬 Miss!"}
                    </p>
                  </div>
                )}

                {/* Player */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-5xl">
                  🧍
                </div>
              </div>

              {/* Shoot button */}
              <button
                onClick={shoot}
                disabled={shooting}
                className="mt-4 w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-2xl py-6 rounded-2xl transition-all active:scale-95"
              >
                {shooting ? "..." : "🏒  SHOOT!"}
              </button>

              <p className="text-center text-zinc-600 text-sm mt-3">
                Time your shot — hit the net!
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
