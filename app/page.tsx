import Link from "next/link";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Reveal from "./components/Reveal";
import AgentLine from "./components/AgentLine";

const proof = [
  {
    stat: "03",
    label: "Patents",
    note: "Including one co-invented with Dharmesh Shah",
  },
  {
    stat: "03",
    label: "Main-stage launches",
    note: "INBOUND '23, '24, '25 — three years running",
  },
  {
    stat: "80+",
    label: "AI features shipped",
    note: "Unified into one platform: Breeze",
  },
  {
    stat: "73%",
    label: "Fewer crashes",
    note: "Reported by fleets on Samsara's AI safety tools",
  },
];

const shippingLog = [
  {
    year: "2023",
    name: "ChatSpot",
    note: "HubSpot's first AI assistant, launched into the ChatGPT spring",
    status: "shipped",
  },
  {
    year: "2024",
    name: "Breeze",
    note: "One AI platform — Copilot, Agents, Intelligence",
    status: "shipped",
  },
  {
    year: "2025",
    name: "Breeze Agents",
    note: "20+ digital teammates, plus Studio and a marketplace",
    status: "shipped",
  },
  {
    year: "2026",
    name: "Samsara agent platform",
    note: "AI coaching that rides along with commercial drivers",
    status: "in flight",
  },
];

const principles = [
  {
    title: "Demos are promises.",
    body: "If it can't survive contact with a real customer, it isn't a product — it's theater with a waitlist.",
  },
  {
    title: "Agents earn trust like new hires.",
    body: "Small tasks first. Receipts always. Autonomy is compensation for good work.",
  },
  {
    title: "The model isn't the moat.",
    body: "Everyone rents the same brains. The moat is the work you wire them into — the data, the context, the job to be done.",
  },
  {
    title: "Speed is table stakes. Taste is the edge.",
    body: "Anyone can ship an AI feature in a weekend now. Knowing which one not to ship is the job.",
  },
  {
    title: "Build for the person doing the work.",
    body: "Not the person buying the software. The driver, the rep, the human with a quota and a family.",
  },
];

function SectionHeader({
  index,
  title,
  heading,
}: {
  index: string;
  title: string;
  heading: React.ReactNode;
}) {
  return (
    <div className="mb-12 sm:mb-16">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-amber">
        {index} — {title}
      </p>
      <h2 className="font-display text-4xl leading-[1.05] text-paper sm:text-6xl">
        {heading}
      </h2>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main className="min-h-screen">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="flex min-h-screen flex-col justify-center px-6 pt-24 pb-16 sm:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p
              className="hero-rise mb-8 font-mono text-[11px] uppercase tracking-[0.3em] text-amber"
              style={{ animationDelay: "0ms" }}
            >
              Dylan Sellberg · Sr. Director of Product, Samsara · prev. HubSpot AI
            </p>
            <h1
              className="hero-rise mb-10 font-display text-[17vw] leading-[0.95] tracking-tight text-paper sm:text-8xl md:text-9xl"
              style={{ animationDelay: "120ms" }}
            >
              I teach software
              <br />
              to <em className="text-amber">do the work.</em>
            </h1>
            <div
              className="hero-rise max-w-2xl"
              style={{ animationDelay: "240ms" }}
            >
              <p className="mb-8 text-lg leading-relaxed text-muted sm:text-xl">
                I led HubSpot&rsquo;s flagship AI launches — ChatSpot, Breeze,
                and Breeze Agents, three straight years on the INBOUND main
                stage. Now I build the agent platform at Samsara, where AI
                rides shotgun with the people who keep the physical world
                running.
              </p>
              <AgentLine />
            </div>
          </div>
        </section>

        {/* ── Proof strip ──────────────────────────────────────── */}
        <section className="border-y border-line">
          <div className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
            {proof.map((item, i) => (
              <div
                key={item.label}
                className={`border-line px-6 py-10 max-lg:even:border-l sm:px-10 ${
                  i > 0 ? "lg:border-l" : ""
                } ${i >= 2 ? "max-lg:border-t" : ""}`}
              >
                <Reveal delay={i * 90}>
                  <p className="font-display text-5xl text-paper sm:text-6xl">
                    {item.stat}
                  </p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-amber">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.note}
                  </p>
                </Reveal>
              </div>
            ))}
          </div>
        </section>

        {/* ── The arc ──────────────────────────────────────────── */}
        <section className="px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeader
                index="01"
                title="The arc"
                heading={
                  <>
                    From inboxes
                    <br />
                    to <em className="text-amber">interstates.</em>
                  </>
                }
              />
            </Reveal>

            <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <div className="border-t border-line pt-8">
                  <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
                    Act I · HubSpot
                  </p>
                  <h3 className="mb-5 font-display text-3xl text-paper">
                    Walked in an implementation specialist. Walked out the
                    director who put HubSpot&rsquo;s AI on stage.
                  </h3>
                  <p className="mb-6 leading-relaxed text-muted">
                    I learned software from the inside — watching real
                    businesses collide with real products — then spent my
                    career closing that gap. Rebuilt the CRM data model.
                    Shipped AI deduplication before &ldquo;AI&rdquo; was a
                    pitch deck. Took the Facebook Messenger integration from
                    zero to one. When the ChatGPT moment hit, I was leading
                    product for HubSpot&rsquo;s AI Innovation Labs — and we
                    moved first.
                  </p>
                  <ul className="space-y-2.5 font-mono text-[13px] text-muted">
                    {[
                      "ChatSpot — HubSpot's first AI assistant",
                      "Breeze — 80+ AI features, one coherent platform",
                      "Breeze Agents, Studio & Marketplace",
                      "3 patents — AI concierge, entity resolution, custom objects",
                    ].map((line) => (
                      <li key={line} className="flex gap-3">
                        <span className="select-none text-amber">→</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="border-t border-line pt-8">
                  <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
                    Act II · Samsara
                  </p>
                  <h3 className="mb-5 font-display text-3xl text-paper">
                    The digital economy has plenty of copilots. The physical
                    economy is where AI gets real.
                  </h3>
                  <p className="mb-6 leading-relaxed text-muted">
                    Trucks, fleets, job sites — the operations that feed,
                    build, and move everything. At Samsara I lead product for
                    the agent platform: AI that briefs a driver before the
                    route, coaches them through it, and debriefs after,
                    tracking 45+ risk factors the whole way. When this
                    software does its job, someone gets home safe. That&rsquo;s
                    a product review I take personally.
                  </p>
                  <ul className="space-y-2.5 font-mono text-[13px] text-muted">
                    {[
                      "Voice agents that coach drivers in real time",
                      "Personalized pre-trip briefings, at fleet scale",
                      "AI role-play & guided coaching for managers",
                      "Up to 73% fewer crashes for fleets using the AI safety stack",
                    ].map((line) => (
                      <li key={line} className="flex gap-3">
                        <span className="select-none text-amber">→</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Shipping log ─────────────────────────────────────── */}
        <section className="border-t border-line px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeader
                index="02"
                title="Shipping log"
                heading={
                  <>
                    Launched on stage.
                    <br />
                    Proven in <em className="text-amber">production.</em>
                  </>
                }
              />
            </Reveal>

            <div className="border-t border-line">
              {shippingLog.map((row, i) => (
                <Reveal key={row.name} delay={i * 70}>
                  <div className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 border-b border-line py-6 transition-colors hover:bg-ink-2 sm:grid-cols-[90px_1fr_auto] sm:gap-x-10 sm:px-4">
                    <p className="font-mono text-sm text-faint">{row.year}</p>
                    <div>
                      <p className="font-display text-2xl text-paper transition-colors group-hover:text-amber sm:text-3xl">
                        {row.name}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {row.note}
                      </p>
                    </div>
                    <p className="col-start-2 mt-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] sm:col-start-3 sm:mt-0">
                      {row.status === "in flight" ? (
                        <>
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-amber"
                            style={{
                              animation: "signalPulse 2.4s ease-in-out infinite",
                            }}
                          />
                          <span className="text-amber">In flight</span>
                        </>
                      ) : (
                        <span className="text-faint">Shipped</span>
                      )}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="mt-10 flex flex-wrap gap-8">
                <Link
                  href="/work/product-launch-talks"
                  className="group font-mono text-[12px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-amber"
                >
                  Watch the launches{" "}
                  <span className="inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <Link
                  href="/work/patents"
                  className="group font-mono text-[12px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-amber"
                >
                  Read the patents{" "}
                  <span className="inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Principles ───────────────────────────────────────── */}
        <section className="border-t border-line px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeader
                index="03"
                title="How I operate"
                heading={
                  <>
                    Strong opinions,
                    <br />
                    <em className="text-amber">shipped</em> weekly.
                  </>
                }
              />
            </Reveal>

            <div className="max-w-3xl">
              {principles.map((p, i) => (
                <Reveal key={p.title} delay={i * 60}>
                  <div className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-line py-8 sm:gap-x-10 last:border-b last:border-line">
                    <p className="font-mono text-sm text-amber">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <div>
                      <h3 className="mb-2 font-display text-2xl text-paper sm:text-3xl">
                        {p.title}
                      </h3>
                      <p className="leading-relaxed text-muted">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── After hours ──────────────────────────────────────── */}
        <section className="border-t border-line px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeader
                index="04"
                title="After hours"
                heading={
                  <>
                    The building
                    <br />
                    doesn&rsquo;t <em className="text-amber">stop at five.</em>
                  </>
                }
              />
            </Reveal>

            <Reveal>
              <p className="mb-12 max-w-2xl text-lg leading-relaxed text-muted">
                I&rsquo;ve been building things since I was 11, and the habit
                stuck. These days that means arcade games for my son — the
                toughest stakeholder I&rsquo;ve ever shipped for: instant
                feedback, zero diplomacy — a live market dashboard I check
                before breakfast, and this site, which an AI agent redesigned
                while I supervised. The tools changed. The itch didn&rsquo;t.
              </p>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  href: "/work",
                  label: "01",
                  title: "The work",
                  note: "Patents, keynotes, launches",
                },
                {
                  href: "/about",
                  label: "02",
                  title: "The longer story",
                  note: "From age 11 to the agent era",
                },
                {
                  href: "/personal",
                  label: "03",
                  title: "The lab",
                  note: "Family-only builds. Password required.",
                },
              ].map((card, i) => (
                <Reveal key={card.href} delay={i * 80}>
                  <Link
                    href={card.href}
                    className="group block border border-line p-6 transition-colors hover:border-amber/40 hover:bg-ink-2 sm:p-8"
                  >
                    <p className="mb-6 font-mono text-[11px] tracking-[0.2em] text-faint">
                      {card.label}
                    </p>
                    <p className="font-display text-2xl text-paper transition-colors group-hover:text-amber">
                      {card.title}
                    </p>
                    <p className="mt-2 text-sm text-muted">{card.note}</p>
                    <p className="mt-6 font-mono text-sm text-faint transition-all group-hover:translate-x-1 group-hover:text-amber">
                      →
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
