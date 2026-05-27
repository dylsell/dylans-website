import Link from "next/link";
import { cookies } from "next/headers";
import Nav from "../components/Nav";
import Gate from "./Gate";

export default async function PersonalLanding({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const expected = process.env.PERSONAL_PASSWORD;
  const supplied = (await cookies()).get("personal_auth")?.value;
  const authed = !!expected && supplied === expected;
  const { next } = await searchParams;

  if (!authed) {
    return (
      <>
        <Nav />
        <main className="min-h-screen bg-zinc-950 px-8 pt-28 pb-16">
          <div className="max-w-md mx-auto">
            <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">Personal</p>
            <h1 className="text-5xl font-black text-white mb-2">Private</h1>
            <p className="text-zinc-500 mb-8">Enter the password to continue.</p>
            <Gate redirectTo={next || "/personal"} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-8 pt-28 pb-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">Personal</p>
          <h1 className="text-5xl font-black text-white mb-2">Personal</h1>
          <p className="text-zinc-500 mb-10">Stuff I&apos;ve built that&apos;s not meant for the world.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/personal/kids"
              className="group block rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg hover:scale-[1.03] hover:shadow-xl transition-all"
            >
              <div className="text-4xl mb-3">🎮</div>
              <h2 className="text-xl font-bold">Bradley&apos;s Games</h2>
              <p className="text-white/70 text-sm mt-1">Microapps for my son.</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
