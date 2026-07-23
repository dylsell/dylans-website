import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Patents, main-stage product launches, and AI shipped to production.",
};

const sections = [
  {
    href: "/work/product-launch-talks",
    index: "01",
    title: "Product launch talks",
    description:
      "Three consecutive years on the INBOUND main stage — ChatSpot, Breeze, and Breeze Agents. Watch the AI era arrive in real time.",
    tag: "Speaking",
    external: false,
  },
  {
    href: "/work/patents",
    index: "02",
    title: "Patents",
    description:
      "Three granted and published patents from HubSpot — entity resolution, custom objects, and an AI concierge co-invented with Dharmesh Shah.",
    tag: "Intellectual property",
    external: false,
  },
  {
    href: "https://www.samsara.com/blog/introducing-samsara-coach",
    index: "03",
    title: "Samsara Coach",
    description:
      "The current chapter: AI coaching that rides along with commercial drivers. Read how Samsara is putting agents to work in the physical economy.",
    tag: "In the wild",
    external: true,
  },
];

export default function Work() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-6 pt-36 pb-24 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="hero-rise mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-amber">
            Work
          </p>
          <h1
            className="hero-rise mb-6 font-display text-6xl leading-[0.98] text-paper sm:text-8xl"
            style={{ animationDelay: "100ms" }}
          >
            Receipts,
            <br />
            not <em className="text-amber">promises.</em>
          </h1>
          <p
            className="hero-rise mb-16 max-w-xl text-lg text-muted"
            style={{ animationDelay: "200ms" }}
          >
            Product leadership is a portfolio of shipped things. Here&rsquo;s
            mine — on stage, on record, and on the road.
          </p>

          <div className="border-t border-line">
            {sections.map((section, i) => {
              const inner = (
                <div className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 border-b border-line py-8 transition-colors hover:bg-ink-2 sm:gap-x-10 sm:px-4">
                  <p className="font-mono text-sm text-faint">
                    {section.index}
                  </p>
                  <div>
                    <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                      {section.tag}
                    </p>
                    <h2 className="font-display text-3xl text-paper transition-colors group-hover:text-amber sm:text-4xl">
                      {section.title}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                      {section.description}
                    </p>
                  </div>
                  <span className="font-mono text-xl text-faint transition-all group-hover:translate-x-1 group-hover:text-amber">
                    {section.external ? "↗" : "→"}
                  </span>
                </div>
              );
              return (
                <Reveal key={section.href} delay={i * 80}>
                  {section.external ? (
                    <a
                      href={section.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {inner}
                    </a>
                  ) : (
                    <Link href={section.href} className="block">
                      {inner}
                    </Link>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
