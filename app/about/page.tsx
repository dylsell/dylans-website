import Nav from "../components/Nav";

export default function About() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 flex flex-col justify-center px-8 pt-24">
        <div className="max-w-4xl mx-auto w-full">
          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">About</p>
          <h1 className="text-6xl font-black text-white mb-6">Coming soon.</h1>
          <p className="text-zinc-500 text-xl">The longer version of the story.</p>
        </div>
      </main>
    </>
  );
}
