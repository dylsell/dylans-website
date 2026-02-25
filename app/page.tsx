import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-5xl font-bold text-indigo-700 tracking-tight">
          Dylan&apos;s Website
        </h1>
        <p className="text-xl text-slate-500">Welcome!</p>

        <div className="grid gap-4 mt-10">
          <Link
            href="/kids"
            className="group block rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-400 p-8 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-2xl font-bold">Kids Games</h2>
            <p className="text-yellow-100 mt-1">
              Fun learning games for little ones
            </p>
          </Link>
        </div>

        <p className="text-sm text-slate-400 mt-8">More coming soon</p>
      </div>
    </main>
  );
}
