import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import Reveal from "../../components/Reveal";

export const metadata: Metadata = {
  title: "Product launch talks",
  description:
    "Three consecutive years on the INBOUND main stage — ChatSpot, Breeze, and Breeze Agents.",
};

const talks = [
  {
    year: "2023",
    id: "hT4NvY1vbK0",
    title: "Meet ChatSpot",
    event: "INBOUND 2023",
    location: "Boston, MA",
    label: "The AI assistant era begins",
    description:
      "Six months after ChatGPT reshaped the industry, I brought ChatSpot to INBOUND — our bet on what AI built for business, not consumers, should look like. The core idea was simple: your CRM already holds everything you know about your customers, so your AI should work from that context, not around it. Natural language access to CRM data, AI-assisted prospecting, content generation grounded in real business signals. An early and deliberate stake in the ground.",
    tags: ["AI assistant", "CRM", "Natural language"],
  },
  {
    year: "2024",
    id: "QP0SHDV_7Ts",
    title: "Meet Breeze",
    event: "INBOUND 2024",
    location: "Boston, MA",
    label: "Building the AI platform",
    description:
      "A year in, it was clear that point solutions weren't enough. I led the product vision for Breeze — HubSpot's unified AI layer built on three foundations: Copilot for in-context assistance across every surface, Agents for autonomous end-to-end execution, and Intelligence to enrich customer data at scale. The goal: collapse the gap between enterprise-grade AI and the speed a growing business actually needs. Eighty AI features. One coherent platform.",
    tags: ["AI platform", "Copilot", "Agents", "Intelligence"],
  },
  {
    year: "2025",
    id: "qHXMlj6fdrI",
    title: "Breeze Agents: Your New Digital Teammates",
    event: "INBOUND 2025",
    location: "San Francisco, CA",
    label: "The agentic future",
    description:
      "The shift from AI tools to AI teammates is the most significant change I've seen in enterprise software in a decade. At INBOUND 2025 I presented the next chapter: 20+ purpose-built Breeze Agents operating across sales, marketing, and service — not waiting to be prompted, but proactively executing work. We also launched Breeze Studio and the Agent Marketplace, opening the platform to builders. The question is no longer whether to adopt AI. It's whether your AI can actually get things done.",
    tags: ["AI agents", "Agentic AI", "Marketplace"],
  },
];

export default function ProductLaunchTalks() {
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
            Speaking
          </p>
          <h1 className="mb-6 font-display text-6xl leading-[0.98] text-paper sm:text-7xl">
            Three years,
            <br />
            three <em className="text-amber">launches.</em>
          </h1>
          <p className="mb-20 max-w-xl text-lg text-muted">
            Watch the AI era arrive in real time — the INBOUND main-stage
            launches that shaped how HubSpot and its customers approached AI.
          </p>

          <div className="space-y-20">
            {[...talks].reverse().map((talk) => (
              <Reveal key={talk.id}>
                <article className="border-t border-line pt-8">
                  <div className="mb-4 flex items-baseline justify-between gap-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-amber">
                      {talk.label}
                    </p>
                    <p className="font-display text-3xl text-faint">
                      {talk.year}
                    </p>
                  </div>
                  <h2 className="mb-1 font-display text-3xl text-paper sm:text-4xl">
                    {talk.title}
                  </h2>
                  <p className="mb-6 font-mono text-[12px] text-muted">
                    {talk.event} · {talk.location}
                  </p>

                  <div
                    className="relative mb-6 w-full overflow-hidden border border-line bg-ink-2"
                    style={{ paddingBottom: "56.25%" }}
                  >
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={`https://www.youtube.com/embed/${talk.id}`}
                      title={talk.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <p className="mb-6 leading-relaxed text-muted">
                    {talk.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {talk.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
