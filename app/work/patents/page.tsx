import Link from "next/link";
import Nav from "../../components/Nav";

const patents = [
  {
    number: "US20240211439A1",
    title: "AI/ML Concierge for a Multi-Client Distributed System",
    description:
      "A conversational AI system that processes natural language commands to generate reports, drafts, documents, and manage CRM data — all through simple chat rather than traditional app interfaces.",
    coInventors: ["Dharmesh Shah"],
    href: "https://patents.google.com/patent/US20240211439",
    featured: true,
  },
  {
    number: "US12386797B2",
    title: "Multi-Service Business Platform System Having Entity Resolution Systems and Methods",
    description:
      "An AI/ML system for identifying and resolving duplicate business entities across large datasets using vectorization, neural networks, and companion matrix scoring.",
    coInventors: [],
    href: "https://patents.google.com/patent/US12386797",
    featured: false,
  },
  {
    number: "US12511256B2",
    title: "Multi-Service Business Platform System Having Custom Object Systems and Methods",
    description:
      "A flexible CRM platform enabling businesses to define arbitrary custom objects and apply workflow automation, reporting, and analytics without being locked into preset data structures.",
    coInventors: [],
    href: "https://patents.google.com/patent/US12511256",
    featured: false,
  },
];

export default function Patents() {
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

          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-4">
            Intellectual Property
          </p>
          <h1 className="text-5xl font-black text-white mb-2">Patents</h1>
          <p className="text-zinc-500 text-lg mb-12">
            Granted and published patents from my time at HubSpot.
          </p>

          <div className="flex flex-col gap-6">
            {patents.map((patent) => (
              <a
                key={patent.number}
                href={patent.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group block rounded-2xl border p-8 transition-all hover:bg-zinc-900 ${
                  patent.featured
                    ? "border-indigo-500/40 bg-indigo-950/20 hover:border-indigo-400"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {patent.featured && (
                      <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-3">
                        Featured
                      </p>
                    )}
                    <h2
                      className={`text-xl font-bold mb-3 transition-colors ${
                        patent.featured
                          ? "text-white group-hover:text-indigo-300"
                          : "text-white group-hover:text-indigo-400"
                      }`}
                    >
                      {patent.title}
                    </h2>
                    <p className="text-zinc-400 leading-relaxed mb-4">
                      {patent.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-zinc-600 font-mono">{patent.number}</span>
                      {patent.coInventors.length > 0 && (
                        <span className="text-zinc-500">
                          Co-invented with{" "}
                          <span className="text-zinc-300">
                            {patent.coInventors.join(", ")}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-600 group-hover:text-indigo-400 text-xl transition-colors shrink-0 mt-1">
                    ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
