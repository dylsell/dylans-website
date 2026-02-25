import Link from "next/link";
import Nav from "../../components/Nav";

const talks = [
  {
    id: "QP0SHDV_7Ts",
    title: "Meet Breeze",
    event: "INBOUND 2024",
  },
  {
    id: "hT4NvY1vbK0",
    title: "Meet ChatSpot",
    event: "INBOUND 2023",
  },
  {
    id: "qHXMlj6fdrI",
    title: "Breeze Agents",
    event: "INBOUND 2025",
  },
];

export default function ProductLaunchTalks() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-8 pt-28 pb-16">
        <div className="max-w-4xl mx-auto w-full">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors mb-8"
          >
            ← Work
          </Link>

          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">Speaking</p>
          <h1 className="text-5xl font-black text-white mb-2">Product Launch Talks</h1>
          <p className="text-zinc-500 text-lg mb-12">On-stage at HubSpot&apos;s INBOUND conference.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {talks.map((talk) => (
              <div key={talk.id}>
                <div
                  className="relative w-full rounded-xl overflow-hidden bg-zinc-900 mb-3"
                  style={{ paddingBottom: "56.25%" }}
                >
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${talk.id}`}
                    title={talk.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="text-white font-bold">{talk.title}</p>
                <p className="text-indigo-400 text-sm">{talk.event}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
