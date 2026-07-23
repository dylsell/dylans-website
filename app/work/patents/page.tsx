import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import Reveal from "../../components/Reveal";

export const metadata: Metadata = {
  title: "Patents",
  description:
    "Three granted and published patents from HubSpot, including an AI concierge co-invented with Dharmesh Shah.",
};

const patents = [
  {
    number: "US20240211439A1",
    title: "AI/ML Concierge for a Multi-Client Distributed System",
    description:
      "A conversational AI system that processes natural language commands to generate reports, drafts, documents, and manage CRM data — through chat rather than traditional app interfaces. Filed before most of the industry believed talking to your CRM was a product.",
    coInventors: ["Dharmesh Shah"],
    href: "https://patents.google.com/patent/US20240211439",
    featured: true,
  },
  {
    number: "US12386797B2",
    title:
      "Multi-Service Business Platform System Having Entity Resolution Systems and Methods",
    description:
      "An AI/ML system for identifying and resolving duplicate business entities across large datasets using vectorization, neural networks, and companion matrix scoring.",
    coInventors: [],
    href: "https://patents.google.com/patent/US12386797",
    featured: false,
  },
  {
    number: "US12511256B2",
    title:
      "Multi-Service Business Platform System Having Custom Object Systems and Methods",
    description:
      "A flexible CRM platform enabling businesses to define arbitrary custom objects and apply workflow automation, reporting, and analytics without preset data structures.",
    coInventors: [],
    href: "https://patents.google.com/patent/US12511256",
    featured: false,
  },
];

export default function Patents() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-6 pt-36 pb-24 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/work"
            className="mb-10 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-amber"
          >
            ← Work
          </Link>

          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-amber">
            Intellectual property
          </p>
          <h1 className="mb-6 font-display text-6xl leading-[0.98] text-paper sm:text-7xl">
            On the <em className="text-amber">record.</em>
          </h1>
          <p className="mb-16 max-w-xl text-lg text-muted">
            Three granted and published patents from my years at HubSpot —
            the paper trail of building AI into a CRM before it was obvious.
          </p>

          <div className="space-y-6">
            {patents.map((patent, i) => (
              <Reveal key={patent.number} delay={i * 80}>
                <a
                  href={patent.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block border p-8 transition-colors hover:bg-ink-2 ${
                    patent.featured
                      ? "border-amber/35 hover:border-amber/60"
                      : "border-line hover:border-amber/30"
                  }`}
                >
                  {patent.featured && (
                    <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-amber">
                      Featured
                    </p>
                  )}
                  <h2 className="mb-3 font-display text-2xl leading-snug text-paper transition-colors group-hover:text-amber sm:text-3xl">
                    {patent.title}
                  </h2>
                  <p className="mb-5 text-sm leading-relaxed text-muted">
                    {patent.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-faint">
                    <span>{patent.number}</span>
                    {patent.coInventors.length > 0 && (
                      <span>
                        Co-invented with{" "}
                        <span className="text-paper">
                          {patent.coInventors.join(", ")}
                        </span>
                      </span>
                    )}
                    <span className="ml-auto transition-all group-hover:translate-x-1 group-hover:text-amber">
                      ↗
                    </span>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
