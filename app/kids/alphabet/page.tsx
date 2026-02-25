"use client";

import Link from "next/link";
import { useState } from "react";

const LETTERS: Record<
  string,
  { word: string; emoji: string; color: string }
> = {
  A: { word: "Apple", emoji: "🍎", color: "from-red-400 to-rose-500" },
  B: { word: "Ball", emoji: "⚽", color: "from-blue-400 to-indigo-500" },
  C: { word: "Cat", emoji: "🐱", color: "from-orange-400 to-amber-500" },
  D: { word: "Dog", emoji: "🐶", color: "from-yellow-400 to-orange-500" },
  E: { word: "Elephant", emoji: "🐘", color: "from-gray-400 to-slate-500" },
  F: { word: "Fish", emoji: "🐟", color: "from-cyan-400 to-blue-500" },
  G: { word: "Grapes", emoji: "🍇", color: "from-purple-400 to-violet-500" },
  H: { word: "Hat", emoji: "🎩", color: "from-slate-400 to-gray-600" },
  I: { word: "Ice Cream", emoji: "🍦", color: "from-pink-300 to-rose-400" },
  J: { word: "Juice", emoji: "🧃", color: "from-yellow-300 to-lime-400" },
  K: { word: "Kite", emoji: "🪁", color: "from-sky-400 to-blue-500" },
  L: { word: "Lion", emoji: "🦁", color: "from-yellow-400 to-amber-500" },
  M: { word: "Moon", emoji: "🌙", color: "from-indigo-400 to-purple-500" },
  N: { word: "Night", emoji: "🌃", color: "from-blue-600 to-indigo-700" },
  O: { word: "Orange", emoji: "🍊", color: "from-orange-400 to-amber-400" },
  P: { word: "Pizza", emoji: "🍕", color: "from-red-300 to-orange-400" },
  Q: { word: "Queen", emoji: "👑", color: "from-yellow-400 to-amber-500" },
  R: { word: "Rainbow", emoji: "🌈", color: "from-pink-400 to-purple-500" },
  S: { word: "Star", emoji: "⭐", color: "from-yellow-300 to-orange-400" },
  T: { word: "Tiger", emoji: "🐯", color: "from-orange-400 to-red-500" },
  U: { word: "Umbrella", emoji: "☂️", color: "from-teal-400 to-cyan-500" },
  V: { word: "Volcano", emoji: "🌋", color: "from-red-500 to-orange-600" },
  W: { word: "Whale", emoji: "🐋", color: "from-blue-400 to-cyan-500" },
  X: { word: "Xylophone", emoji: "🎵", color: "from-pink-400 to-rose-500" },
  Y: { word: "Yarn", emoji: "🧶", color: "from-pink-300 to-fuchsia-400" },
  Z: { word: "Zebra", emoji: "🦓", color: "from-gray-400 to-zinc-600" },
};

function speak(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

export default function AlphabetGame() {
  const [selected, setSelected] = useState<string | null>(null);

  function handleLetterClick(letter: string) {
    setSelected(letter);
    const { word } = LETTERS[letter];
    speak(`${letter}! ${letter} is for ${word}!`);
  }

  function handleClose() {
    window.speechSynthesis.cancel();
    setSelected(null);
  }

  const data = selected ? LETTERS[selected] : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/kids"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          ← Games
        </Link>

        <h1 className="text-4xl font-bold text-rose-500 mb-1">Alphabet</h1>
        <p className="text-slate-500 mb-6">Tap a letter!</p>

        {/* Letter grid */}
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-7">
          {Object.keys(LETTERS).map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterClick(letter)}
              className={`aspect-square rounded-2xl bg-gradient-to-br ${LETTERS[letter].color} text-white font-bold text-xl shadow-md hover:scale-110 active:scale-95 transition-transform flex items-center justify-center`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Pop-up overlay */}
      {selected && data && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50"
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
              onClick={() => speak(`${selected}! ${selected} is for ${data.word}!`)}
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
  );
}
