import Link from "next/link";
import Nav from "../components/Nav";

const games = [
  {
    href: "/kids/alphabet",
    emoji: "🔤",
    title: "Alphabet",
    description: "Tap a letter to learn its sound",
    color: "from-pink-500 to-rose-500",
  },
];

const comingSoon = [
  { emoji: "🔢", title: "Counting", color: "from-blue-500 to-cyan-500" },
  { emoji: "🎨", title: "Colors & Shapes", color: "from-purple-500 to-pink-500" },
  { emoji: "🐶", title: "Animals", color: "from-green-500 to-teal-500" },
  { emoji: "⚽", title: "Sports", color: "from-orange-500 to-yellow-500" },
];

export default function KidsHub() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-8 pt-28 pb-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">Apps</p>
          <h1 className="text-5xl font-black text-white mb-2">Kids Games</h1>
          <p className="text-zinc-500 mb-10">Educational microapps for my son.</p>

          <div className="grid grid-cols-2 gap-4">
            {games.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                className={`group block rounded-3xl bg-gradient-to-br ${game.color} p-6 text-white shadow-lg hover:scale-[1.03] hover:shadow-xl transition-all`}
              >
                <div className="text-4xl mb-3">{game.emoji}</div>
                <h2 className="text-xl font-bold">{game.title}</h2>
                <p className="text-white/70 text-sm mt-1">{game.description}</p>
              </Link>
            ))}

            {comingSoon.map((game) => (
              <div
                key={game.title}
                className={`block rounded-3xl bg-gradient-to-br ${game.color} p-6 opacity-30 cursor-not-allowed`}
              >
                <div className="text-4xl mb-3">{game.emoji}</div>
                <h2 className="text-xl font-bold text-white">{game.title}</h2>
                <p className="text-white/60 text-sm mt-1">Coming soon</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
