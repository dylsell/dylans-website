import Link from "next/link";
import Nav from "../components/Nav";

const sections = [
  {
    href: "/work/product-launch-talks",
    title: "Product Launch Talks",
    description: "On-stage presentations from INBOUND 2023, 2024, and 2025",
    tag: "Speaking",
  },
  // More coming soon
];

export default function Work() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-8 pt-28 pb-16">
        <div className="max-w-4xl mx-auto w-full">
          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">Work</p>
          <h1 className="text-6xl font-black text-white mb-2">Work</h1>
          <p className="text-zinc-500 text-xl mb-12">Projects, patents, and things I&apos;ve shipped.</p>

          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group flex items-center justify-between p-6 rounded-2xl border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all"
              >
                <div>
                  <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">{section.tag}</p>
                  <h2 className="text-white text-2xl font-bold group-hover:text-indigo-400 transition-colors">
                    {section.title}
                  </h2>
                  <p className="text-zinc-500 mt-1">{section.description}</p>
                </div>
                <span className="text-zinc-600 group-hover:text-indigo-400 text-2xl transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
