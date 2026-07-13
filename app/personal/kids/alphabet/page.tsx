"use client";

import Link from "next/link";
import Nav from "../../../components/Nav";
import { useState, useEffect, useRef } from "react";

const LETTERS: Record<string, { word: string; emoji: string; color: string }> = {
  A: { word: "Athlete",     emoji: "🏅", color: "from-red-400 to-rose-500" },
  B: { word: "Bradley",     emoji: "⭐", color: "from-blue-500 to-indigo-600" },
  C: { word: "Champion",    emoji: "🏆", color: "from-yellow-400 to-orange-500" },
  D: { word: "Dinosaur",    emoji: "🦕", color: "from-green-400 to-emerald-500" },
  E: { word: "Elephant",    emoji: "🐘", color: "from-gray-400 to-slate-500" },
  F: { word: "Football",    emoji: "🏈", color: "from-orange-500 to-amber-600" },
  G: { word: "Golf",        emoji: "⛳", color: "from-green-500 to-teal-500" },
  H: { word: "Hockey",      emoji: "🏒", color: "from-sky-400 to-blue-500" },
  I: { word: "Ice Cream",   emoji: "🍦", color: "from-pink-300 to-rose-400" },
  J: { word: "Jump",        emoji: "🦘", color: "from-lime-400 to-green-500" },
  K: { word: "Kick",        emoji: "🦵", color: "from-red-400 to-orange-500" },
  L: { word: "Logan",       emoji: "🤝", color: "from-purple-500 to-violet-600" },
  M: { word: "Movies",      emoji: "🎬", color: "from-slate-500 to-zinc-600" },
  N: { word: "Nellie",      emoji: "🐶", color: "from-amber-400 to-yellow-500" },
  O: { word: "Outside",     emoji: "🌤️", color: "from-cyan-400 to-sky-500" },
  P: { word: "Puzzles",     emoji: "🧩", color: "from-fuchsia-400 to-purple-500" },
  Q: { word: "Quarterback", emoji: "🏈", color: "from-green-500 to-emerald-600" },
  R: { word: "Race",        emoji: "🏎️", color: "from-red-500 to-rose-600" },
  S: { word: "Spiderman",   emoji: "🕷️", color: "from-red-500 to-red-700" },
  T: { word: "Trucks",      emoji: "🚛", color: "from-orange-400 to-red-500" },
  U: { word: "Uniform",     emoji: "👕", color: "from-blue-400 to-indigo-500" },
  V: { word: "Video Games", emoji: "🎮", color: "from-violet-500 to-purple-600" },
  W: { word: "Win",         emoji: "🥇", color: "from-yellow-400 to-amber-500" },
  X: { word: "X Factor",    emoji: "💥", color: "from-pink-500 to-rose-600" },
  Y: { word: "Yard",        emoji: "🏡", color: "from-green-400 to-lime-500" },
  Z: { word: "Zoom",        emoji: "💨", color: "from-blue-400 to-cyan-500" },
};

const ALL_LETTERS = Object.keys(LETTERS);

// Letter sounds for phonics — spelled so TTS pronounces them like the sound
const PHONICS: Record<string, string> = {
  A: "ah", B: "buh", C: "kuh", D: "duh", E: "eh", F: "fff", G: "guh",
  H: "huh", I: "ih", J: "juh", K: "kuh", L: "lll", M: "mmm", N: "nnn",
  O: "aw", P: "puh", Q: "kwuh", R: "rrr", S: "sss", T: "tuh", U: "uh",
  V: "vvv", W: "wuh", X: "ks", Y: "yuh", Z: "zzz",
};

const SPECIAL_WORDS: Record<string, string> = {
  B: "B is for Bradley — that's you!",
  L: "L is for Logan — your brother!",
  N: "N is for Nellie — your dog!",
  S: "S is for Spiderman!",
};

const PRAISE = ["Yes!", "Great job!", "You got it!", "Awesome!", "Way to go, Bradley!"];

function wordPhrase(letter: string) {
  return SPECIAL_WORDS[letter] ?? `${letter} is for ${LETTERS[letter].word}!`;
}

const VOICE_PRIORITY = [
  "Google US English", "Samantha (Premium)", "Alex (Premium)", "Ava (Premium)",
  "Samantha (Enhanced)", "Ava (Enhanced)", "Samantha", "Google UK English Female",
];

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const name of VOICE_PRIORITY) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  return (
    voices.find((v) => v.lang === "en-US" && !v.name.toLowerCase().includes("compact")) ??
    voices.find((v) => v.lang.startsWith("en")) ?? null
  );
}

function speakFallback(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.82; u.pitch = 1.05; u.volume = 1;
  // Wait for voices if not loaded yet
  const trySpeak = () => {
    const voice = getBestVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length) {
    trySpeak();
  } else {
    window.speechSynthesis.addEventListener("voiceschanged", trySpeak, { once: true });
  }
}

// One audio element at a time so phrases never talk over each other
let currentAudio: HTMLAudioElement | null = null;

function stopSpeech() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (typeof window !== "undefined") window.speechSynthesis.cancel();
}

async function speakText(text: string) {
  if (typeof window === "undefined") return;
  stopSpeech();
  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("no_key");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => { URL.revokeObjectURL(url); if (currentAudio === audio) currentAudio = null; };
    audio.play();
  } catch {
    speakFallback(text);
  }
}

function learnPhrase(letter: string) {
  return `${letter}! ${letter} says ${PHONICS[letter]}. ${wordPhrase(letter)}`;
}

function playPop(ac: AudioContext) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(900, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.09);
  gain.gain.setValueAtTime(0.18, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);
  osc.start(); osc.stop(ac.currentTime + 0.09);
}

function playClear(ac: AudioContext) {
  // Happy two-note chime
  [0, 0.1].forEach((delay, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime([660, 880][i], ac.currentTime + delay);
    gain.gain.setValueAtTime(0.15, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.18);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + 0.18);
  });
}

function playOops(ac: AudioContext) {
  // Gentle "try again" — soft descending wobble, nothing scary
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(300, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(220, ac.currentTime + 0.18);
  gain.gain.setValueAtTime(0.1, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
  osc.start(); osc.stop(ac.currentTime + 0.2);
}

const CONFETTI_COLORS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6bcd","#fff","#ff9f43"];

function Confetti() {
  const pieces = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: Math.random() * 100,
    delay: Math.random() * 2.5,
    dur: 2.5 + Math.random() * 2,
    size: 7 + Math.random() * 9,
    round: Math.random() > 0.5,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: "-12px",
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: p.round ? "50%" : "2px",
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

type Mode = "learn" | "find";

export default function AlphabetGame() {
  const [mode, setMode] = useState<Mode>("learn");
  const [remaining, setRemaining] = useState<Set<string>>(new Set(ALL_LETTERS));
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleared = ALL_LETTERS.length - remaining.size;
  const done = remaining.size === 0;
  const data = selected ? LETTERS[selected] : null;

  function getAudio() {
    if (!audioRef.current) audioRef.current = new AudioContext();
    return audioRef.current;
  }

  function bumpStreak() {
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak >= 3) {
      setShowStreak(true);
      if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
      streakTimerRef.current = setTimeout(() => setShowStreak(false), 1800);
    }
  }

  function clearTile(letter: string) {
    setExiting(prev => new Set([...prev, letter]));
    setTimeout(() => {
      setRemaining(prev => { const n = new Set(prev); n.delete(letter); return n; });
      setExiting(prev => { const n = new Set(prev); n.delete(letter); return n; });
    }, 420);
  }

  function pickTarget(pool: string[]): string | null {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function handleLetterClick(letter: string) {
    if (!remaining.has(letter) || exiting.has(letter)) return;

    if (mode === "learn") {
      if (selected) return;
      playPop(getAudio());
      setSelected(letter);
      speakText(learnPhrase(letter));
      return;
    }

    // ── Find It! mode ──
    if (!target) return;
    if (letter === target) {
      playClear(getAudio());
      bumpStreak();
      clearTile(letter);
      const pool = [...remaining].filter(l => l !== letter && !exiting.has(l));
      const next = pickTarget(pool);
      setTarget(next);
      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      if (next) {
        speakText(`${praise} ${letter}! ${wordPhrase(letter)} Now, can you find the letter ${next}?`);
      } else {
        speakText(`${praise} ${letter}! You found every single letter!`);
      }
    } else {
      playOops(getAudio());
      setStreak(0);
      setWrong(letter);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = setTimeout(() => setWrong(null), 600);
      speakText(`That's the letter ${letter}. Can you find the letter ${target}?`);
    }
  }

  function handleClose() {
    if (!selected) return;
    stopSpeech();
    playClear(getAudio());
    const letter = selected;
    setSelected(null);
    bumpStreak();
    clearTile(letter);
  }

  function switchMode(m: Mode) {
    if (m === mode) return;
    stopSpeech();
    setMode(m);
    setSelected(null);
    setWrong(null);
    if (m === "find") {
      const t = pickTarget([...remaining].filter(l => !exiting.has(l)));
      setTarget(t);
      if (t) speakText(`Can you find the letter ${t}?`);
    } else {
      setTarget(null);
    }
  }

  function handleReset() {
    stopSpeech();
    setRemaining(new Set(ALL_LETTERS));
    setSelected(null);
    setExiting(new Set());
    setStreak(0);
    setShowStreak(false);
    setWrong(null);
    if (mode === "find") {
      const t = pickTarget(ALL_LETTERS);
      setTarget(t);
      if (t) speakText(`Can you find the letter ${t}?`);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const letter = e.key.toUpperCase();
      if (ALL_LETTERS.includes(letter) && !selected) handleLetterClick(letter);
      if (e.key === "Escape" && selected) handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, remaining, mode, target, streak]);

  // Stop any speech when leaving the page
  useEffect(() => () => stopSpeech(), []);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-6 pt-28 pb-16">
        <div className="max-w-4xl mx-auto">
          <Link href="/personal/kids" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors mb-8">
            ← Games
          </Link>

          {done ? (
            <>
              <Confetti />
              <div className="text-center py-12">
                <div className="text-8xl mb-4" style={{ animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>🎉</div>
                <h1 className="text-5xl font-black text-white mb-3">You did it, Bradley!</h1>
                <p className="text-zinc-400 text-xl mb-4">All 26 letters cleared!</p>
                {streak > 0 && (
                  <p className="text-yellow-400 font-bold text-lg mb-8">🔥 Best streak: {streak} in a row!</p>
                )}
                {/* Full reveal photo */}
                <div className="relative rounded-3xl overflow-hidden mb-8 mx-auto max-w-xs shadow-2xl">
                  <img src="/bradley.jpg" alt="Bradley" className="w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <p className="absolute bottom-4 left-0 right-0 text-center text-white font-black text-2xl">⭐ Bradley ⭐</p>
                </div>
                <button onClick={handleReset} className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors">
                  Play again
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-1">Kids Games</p>
                  <h1 className="text-5xl font-black text-white">Alphabet</h1>
                </div>
                <div className="text-right">
                  <p className="text-zinc-600 text-sm mb-1">Cleared</p>
                  <p className="text-white font-black text-3xl">
                    {cleared}<span className="text-zinc-600 font-normal text-lg"> / 26</span>
                  </p>
                </div>
              </div>

              {/* Glowing progress bar */}
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(cleared / 26) * 100}%`,
                    background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
                    boxShadow: cleared > 0 ? "0 0 12px rgba(139,92,246,0.7)" : "none",
                  }}
                />
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => switchMode("learn")}
                  className={`flex-1 py-3 rounded-2xl font-black text-lg transition-all active:scale-95 ${
                    mode === "learn"
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
                  }`}
                >
                  👀 Learn
                </button>
                <button
                  onClick={() => switchMode("find")}
                  className={`flex-1 py-3 rounded-2xl font-black text-lg transition-all active:scale-95 ${
                    mode === "find"
                      ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
                  }`}
                >
                  🎯 Find It!
                </button>
              </div>

              {/* Find-mode prompt bar */}
              {mode === "find" && target && (
                <div className="flex items-center justify-between rounded-2xl bg-zinc-900 border border-pink-500/30 px-5 py-3 mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-400 font-semibold">Find the letter</span>
                    <span
                      key={target}
                      className="text-5xl font-black text-white"
                      style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
                    >
                      {target}
                      <span className="text-pink-400 text-3xl ml-2">{target.toLowerCase()}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => speakText(`Can you find the letter ${target}?`)}
                    className="bg-pink-500/20 hover:bg-pink-500/35 text-pink-300 rounded-full w-12 h-12 text-xl transition-colors"
                    aria-label="Hear it again"
                  >
                    🔊
                  </button>
                </div>
              )}

              {/* Streak popup */}
              {showStreak && streak >= 3 ? (
                <div className="text-center h-10 mb-2">
                  <span
                    className="inline-block text-xl font-black text-yellow-400"
                    style={{ animation: "streakPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
                  >
                    🔥 {streak} in a row!
                  </span>
                </div>
              ) : (
                <div className="h-10 mb-2 flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">
                    {mode === "learn"
                      ? "Tap a letter to hear its sound — clear them all to reveal the secret photo!"
                      : "Listen and tap the right letter!"}
                  </p>
                </div>
              )}

              {/* Photo-reveal letter grid */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                {/* Bradley photo — revealed as tiles clear */}
                <img
                  src="/bradley.jpg"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-top select-none"
                />
                {/* Dark overlay so remaining letters are readable */}
                <div className="absolute inset-0 bg-zinc-950/20" />

                <div className="relative z-10 grid grid-cols-6 gap-3 p-4 sm:gap-4 sm:p-5">
                  {ALL_LETTERS.map((letter) => {
                    const isGone = !remaining.has(letter) && !exiting.has(letter);
                    const isExiting = exiting.has(letter);
                    const isWrong = wrong === letter;

                    if (isGone) {
                      // Transparent slot — photo shows through
                      return (
                        <div
                          key={letter}
                          className="aspect-square rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                        >
                          <span className="text-white/50 text-xl">✓</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={letter}
                        onClick={() => handleLetterClick(letter)}
                        className={`aspect-square rounded-xl bg-gradient-to-br ${LETTERS[letter].color} text-white shadow-lg hover:scale-110 active:scale-95 transition-transform select-none flex items-baseline justify-center gap-0.5 pt-2`}
                        style={
                          isExiting
                            ? { animation: "tileExit 0.42s cubic-bezier(0.55,0,1,0.45) forwards" }
                            : isWrong
                            ? { animation: "wiggle 0.5s ease" }
                            : undefined
                        }
                      >
                        <span className="font-black text-2xl leading-none self-center">{letter}</span>
                        <span className="font-bold text-lg leading-none self-center opacity-70">{letter.toLowerCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Spring popup overlay (Learn mode) */}
        {selected && data && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={handleClose}
          >
            <div
              className={`bg-gradient-to-br ${data.color} rounded-3xl p-12 text-center text-white shadow-2xl max-w-sm w-full`}
              style={{ animation: "popIn 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-9xl mb-4">{data.emoji}</div>
              <div className="text-8xl font-black mb-2 drop-shadow-lg">
                {selected}
                <span className="text-6xl font-bold opacity-70 ml-3">{selected.toLowerCase()}</span>
              </div>
              <div className="text-3xl font-bold">{data.word}</div>
              <p className="text-white/70 text-sm mt-2">{selected} says &ldquo;{PHONICS[selected]}&rdquo; · {selected} is for {data.word}</p>
              <button
                onClick={() => speakText(learnPhrase(selected))}
                className="mt-6 bg-white/20 hover:bg-white/30 rounded-full px-6 py-2 text-sm font-semibold transition-colors"
              >
                🔊 Say it again
              </button>
              <button
                onClick={handleClose}
                className="mt-3 w-full py-3 rounded-xl bg-white/25 hover:bg-white/35 font-black text-lg transition-colors"
              >
                Got it! ✓
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
