import Link from "next/link";

const games = [
  {
    href: "/kids/alphabet",
    emoji: "🔤",
    title: "Alphabet",
    description: "Tap a letter to learn its sound",
    color: "from-pink-400 to-rose-400",
  },
  // More games coming soon
];

const comingSoon = [
  { emoji: "🔢", title: "Counting", color: "from-blue-300 to-cyan-300" },
  { emoji: "🎨", title: "Colors & Shapes", color: "from-purple-300 to-pink-300" },
  { emoji: "🐶", title: "Animals", color: "from-green-300 to-teal-300" },
  { emoji: "⚽", title: "Sports", color: "from-orange-300 to-yellow-300" },
];

export default function KidsHub() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          ← Home
        </Link>

        <h1 className="text-4xl font-bold text-orange-600 mb-2">Kids Games</h1>
        <p className="text-slate-500 mb-8">Pick a game to play!</p>

        <div className="grid grid-cols-2 gap-4">
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className={`group block rounded-3xl bg-gradient-to-br ${game.color} p-6 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all`}
            >
              <div className="text-4xl mb-2">{game.emoji}</div>
              <h2 className="text-xl font-bold">{game.title}</h2>
              <p className="text-white/80 text-sm mt-1">{game.description}</p>
            </Link>
          ))}

          {comingSoon.map((game) => (
            <div
              key={game.title}
              className={`block rounded-3xl bg-gradient-to-br ${game.color} p-6 text-white/60 opacity-50 cursor-not-allowed`}
            >
              <div className="text-4xl mb-2">{game.emoji}</div>
              <h2 className="text-xl font-bold text-white/70">{game.title}</h2>
              <p className="text-white/50 text-sm mt-1">Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
