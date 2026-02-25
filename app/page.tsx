import Nav from "./components/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 flex flex-col justify-center px-8 pt-24 pb-16">
        <div className="max-w-4xl mx-auto w-full">

          {/* Hero */}
          <div className="mb-16">
            <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-6">
              Sr. Director of Product · AI Builder · Dad
            </p>
            <h1 className="text-6xl sm:text-8xl font-black text-white leading-none tracking-tight mb-8">
              I&apos;ve been building<br />
              <span className="text-indigo-400">things</span> since<br />
              I was 11.
            </h1>
            <p className="text-zinc-400 text-xl max-w-xl leading-relaxed">
              Today I build AI products at Samsara, microapps for my kid,
              and whatever else I can&apos;t stop thinking about.
            </p>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-6 mb-24">
            <a
              href="https://linkedin.com/in/dylsell"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white text-sm font-semibold tracking-widest uppercase transition-colors"
            >
              LinkedIn
            </a>
            <span className="text-zinc-700">·</span>
            <a
              href="https://github.com/dylsell"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white text-sm font-semibold tracking-widest uppercase transition-colors"
            >
              GitHub
            </a>
            <span className="text-zinc-700">·</span>
            <a
              href="https://x.com/dylsell"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white text-sm font-semibold tracking-widest uppercase transition-colors"
            >
              Twitter
            </a>
          </div>

          {/* Featured section */}
          <div className="border-t border-zinc-800 pt-12 mb-16">
            <p className="text-zinc-600 text-xs font-semibold tracking-widest uppercase mb-6">
              Latest
            </p>
            <a
              href="/kids"
              className="group flex items-center justify-between p-6 rounded-2xl border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all"
            >
              <div>
                <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">Apps</p>
                <h2 className="text-white text-2xl font-bold group-hover:text-indigo-400 transition-colors">
                  Kids Games
                </h2>
                <p className="text-zinc-500 mt-1">Educational microapps for my son</p>
              </div>
              <span className="text-zinc-600 group-hover:text-indigo-400 text-2xl transition-colors">→</span>
            </a>
          </div>


        </div>
      </main>
    </>
  );
}
