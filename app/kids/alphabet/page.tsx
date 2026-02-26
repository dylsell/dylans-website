"use client";

import Link from "next/link";
import Nav from "../../components/Nav";
import { useState, useEffect } from "react";

const LETTERS: Record<string, { word: string; emoji: string; color: string }> = {
  A: { word: "Athlete",    emoji: "🏅", color: "from-red-400 to-rose-500" },
  B: { word: "Bradley",    emoji: "⭐", color: "from-blue-500 to-indigo-600" },
  C: { word: "Champion",   emoji: "🏆", color: "from-yellow-400 to-orange-500" },
  D: { word: "Dinosaur",   emoji: "🦕", color: "from-green-400 to-emerald-500" },
  E: { word: "Elephant",   emoji: "🐘", color: "from-gray-400 to-slate-500" },
  F: { word: "Football",   emoji: "🏈", color: "from-orange-500 to-amber-600" },
  G: { word: "Golf",       emoji: "⛳", color: "from-green-500 to-teal-500" },
  H: { word: "Hockey",     emoji: "🏒", color: "from-sky-400 to-blue-500" },
  I: { word: "Ice Cream",  emoji: "🍦", color: "from-pink-300 to-rose-400" },
  J: { word: "Jump",       emoji: "🦘", color: "from-lime-400 to-green-500" },
  K: { word: "Kick",       emoji: "🦵", color: "from-red-400 to-orange-500" },
  L: { word: "Logan",      emoji: "🤝", color: "from-purple-500 to-violet-600" },
  M: { word: "Movies",     emoji: "🎬", color: "from-slate-500 to-zinc-600" },
  N: { word: "Nellie",     emoji: "🐶", color: "from-amber-400 to-yellow-500" },
  O: { word: "Outside",    emoji: "🌤️", color: "from-cyan-400 to-sky-500" },
  P: { word: "Puzzles",    emoji: "🧩", color: "from-fuchsia-400 to-purple-500" },
  Q: { word: "Quarterback",emoji: "🏈", color: "from-green-500 to-emerald-600" },
  R: { word: "Race",       emoji: "🏎️", color: "from-red-500 to-rose-600" },
  S: { word: "Spiderman",  emoji: "🕷️", color: "from-red-500 to-red-700" },
  T: { word: "Trucks",     emoji: "🚛", color: "from-orange-400 to-red-500" },
  U: { word: "Uniform",    emoji: "👕", color: "from-blue-400 to-indigo-500" },
  V: { word: "Video Games",emoji: "🎮", color: "from-violet-500 to-purple-600" },
  W: { word: "Win",        emoji: "🥇", color: "from-yellow-400 to-amber-500" },
  X: { word: "X Factor",   emoji: "💥", color: "from-pink-500 to-rose-600" },
  Y: { word: "Yard",       emoji: "🏡", color: "from-green-400 to-lime-500" },
  Z: { word: "Zoom",       emoji: "💨", color: "from-blue-400 to-cyan-500" },
};

const ALL_LETTERS = Object.keys(LETTERS);

// Voice preference order — best quality to fallback
const VOICE_PRIORITY = [
  "Google US English",        // Chrome on desktop — sounds great
  "Samantha (Premium)",       // macOS/iOS premium
  "Alex (Premium)",
  "Ava (Premium)",
  "Allison (Premium)",
  "Susan (Premium)",
  "Samantha (Enhanced)",      // macOS/iOS enhanced
  "Ava (Enhanced)",
  "Allison (Enhanced)",
  "Samantha",                 // macOS built-in — decent
  "Google UK English Female", // Chrome fallback
  "Google UK English Male",
];

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  for (const name of VOICE_PRIORITY) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }

  // Last resort: any en-US voice that isn't a compact/low-quality one
  return (
    voices.find((v) => v.lang === "en-US" && !v.name.toLowerCase().includes("compact")) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.82;
  utterance.pitch = 1.05;
  utterance.volume = 1;

  const voice = getBestVoice();
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

export default function AlphabetGame() {
  const [remaining, setRemaining] = useState<Set<string>>(new Set(ALL_LETTERS));
  const [selected, setSelected] = useState<string | null>(null);

  function handleLetterClick(letter: string) {
    if (!remaining.has(letter)) return;
    setSelected(letter);
    const { word } = LETTERS[letter];
    const special: Record<string, string> = {
      B: "B! B is for Bradley — that's you!",
      L: "L! L is for Logan — your brother!",
      N: "N! N is for Nellie — your dog!",
      S: "S! S is for Spiderman!",
    };
    speak(special[letter] ?? `${letter}! ${letter} is for ${word}!`);
  }

  function handleClose() {
    if (!selected) return;
    window.speechSynthesis.cancel();
    setRemaining((prev) => {
      const next = new Set(prev);
      next.delete(selected);
      return next;
    });
    setSelected(null);
  }

  function handleReset() {
    setRemaining(new Set(ALL_LETTERS));
    setSelected(null);
  }

  // Keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const letter = e.key.toUpperCase();
      if (ALL_LETTERS.includes(letter) && !selected) {
        handleLetterClick(letter);
      }
      if (e.key === "Escape" && selected) {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, remaining]);

  const done = remaining.size === 0;
  const cleared = ALL_LETTERS.length - remaining.size;
  const data = selected ? LETTERS[selected] : null;

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-6 pt-28 pb-16">
        <div className="max-w-2xl mx-auto">

          <Link
            href="/kids"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors mb-8"
          >
            ← Games
          </Link>

          {done ? (
            /* Completion screen */
            <div className="text-center py-16">
              <div className="text-8xl mb-6">🎉</div>
              <h1 className="text-5xl font-black text-white mb-3">You did it!</h1>
              <p className="text-zinc-400 text-xl mb-10">All 26 letters cleared!</p>
              <button
                onClick={handleReset}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors"
              >
                Play again
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-1">
                    Kids Games
                  </p>
                  <h1 className="text-5xl font-black text-white">Alphabet</h1>
                </div>
                <div className="text-right">
                  <p className="text-zinc-600 text-sm mb-1">Cleared</p>
                  <p className="text-white font-black text-3xl">
                    {cleared}
                    <span className="text-zinc-600 font-normal text-lg"> / 26</span>
                  </p>
                </div>
              </div>

              <p className="text-zinc-500 mb-8">
                Tap a letter — or press it on your keyboard!
              </p>

              {/* Letter grid */}
              <div className="grid grid-cols-6 gap-3 sm:grid-cols-7">
                {ALL_LETTERS.map((letter) =>
                  remaining.has(letter) ? (
                    <button
                      key={letter}
                      onClick={() => handleLetterClick(letter)}
                      className={`aspect-square rounded-2xl bg-gradient-to-br ${LETTERS[letter].color} text-white font-black text-xl shadow-lg hover:scale-110 active:scale-95 transition-transform flex items-center justify-center`}
                    >
                      {letter}
                    </button>
                  ) : (
                    <div
                      key={letter}
                      className="aspect-square rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-700 font-black text-xl"
                    >
                      ✓
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* Pop-up overlay */}
        {selected && data && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50"
            onClick={handleClose}
          >
            <div
              className={`bg-gradient-to-br ${data.color} rounded-3xl p-10 text-center text-white shadow-2xl max-w-xs w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-9xl mb-4">{data.emoji}</div>
              <div className="text-8xl font-black mb-2">{selected}</div>
              <div className="text-3xl font-bold">{data.word}</div>
              <p className="text-white/70 text-sm mt-2">
                {selected} is for {data.word}
              </p>
              <button
                onClick={() => {
                  const special: Record<string, string> = {
                    B: "B! B is for Bradley — that's you!",
                    L: "L! L is for Logan — your brother!",
                    N: "N! N is for Nellie — your dog!",
                    S: "S! S is for Spiderman!",
                  };
                  speak(special[selected] ?? `${selected}! ${selected} is for ${data.word}!`);
                }}
                className="mt-6 bg-white/20 hover:bg-white/30 rounded-full px-6 py-2 text-sm font-semibold transition-colors"
              >
                🔊 Say it again
              </button>
              <button
                onClick={handleClose}
                className="mt-3 block w-full text-white/60 hover:text-white text-sm transition-colors"
              >
                tap anywhere to close
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
