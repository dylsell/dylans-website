import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "The longer version — from building things at 11 to leading AI product at HubSpot and Samsara.",
};

const chapters = [
  {
    marker: "Origin",
    title: "Building since 11.",
    body: [
      "Some kids collected cards. I collected half-finished projects — and the occasional finished one. I've been making things with software since I was 11, and every job I've had since has really just been that same instinct with better distribution.",
    ],
  },
  {
    marker: "HubSpot · The inside view",
    title: "I joined to implement software. I stayed to invent it.",
    body: [
      "My first job at HubSpot was implementation specialist — the person who sits with a real business and makes the software actually work for them. It's the best product education there is, because you can't hide from the gap between the demo and the Tuesday morning reality. I decided to spend my career closing that gap.",
      "As a product manager I rebuilt the CRM data model, shipped an AI-powered deduplication app back when machine learning was something you did quietly in the back of the roadmap, and took the Facebook Messenger integration from zero to one. Three patents came out of that stretch of work — entity resolution, custom objects, and an AI concierge co-invented with Dharmesh Shah.",
    ],
  },
  {
    marker: "HubSpot · The AI years",
    title: "Then ChatGPT happened, and we moved first.",
    body: [
      "By the time the ChatGPT moment arrived, I was leading product for HubSpot's AI Innovation Labs. Six months later I was on the INBOUND main stage launching ChatSpot — HubSpot's bet that business AI should work from your customer context, not around it.",
      "That turned into three consecutive years of main-stage launches: ChatSpot in 2023, Breeze in 2024 — eighty-plus AI features unified into one platform — and Breeze Agents in 2025, when the industry stopped talking about AI tools and started shipping AI teammates. I got to lead product through the fastest platform shift enterprise software has ever seen, at one of the companies that set the pace.",
    ],
  },
  {
    marker: "Samsara · Now",
    title: "The physical economy is where AI gets real.",
    body: [
      "Software people build AI for software people — it's a comfortable loop. The work that actually keeps the world running happens in trucks, warehouses, and job sites, and that's where I wanted to point this technology next.",
      "At Samsara I'm the Sr. Director of Product for the agent platform. The flagship is AI coaching that rides along with commercial drivers — a pre-trip briefing before the route, real-time voice coaching through it, a debrief after, with 45+ risk factors watched the whole way. Fleets using Samsara's AI safety tools report up to 73% fewer crashes. When your product works, someone's parent gets home. I've never had a metric I cared about more.",
    ],
  },
  {
    marker: "After hours",
    title: "The itch doesn't clock out.",
    body: [
      "I'm a dad, which means my most demanding user research happens at home: I build arcade games for my son, who delivers feedback with a candor most enterprise customers can only dream of. I watch the markets before breakfast with a dashboard I built myself. And I redesigned this site by directing an AI agent — because if I'm going to tell people agents can do real work, mine should have a portfolio too.",
      "If you're building something interesting — especially where AI meets work that matters — my inbox is open.",
    ],
  },
];

export default function About() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-6 pt-36 pb-24 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="hero-rise mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-amber">
            About
          </p>
          <h1
            className="hero-rise mb-6 font-display text-6xl leading-[0.98] text-paper sm:text-8xl"
            style={{ animationDelay: "100ms" }}
          >
            The longer
            <br />
            <em className="text-amber">version.</em>
          </h1>
          <p
            className="hero-rise mb-20 text-lg text-muted"
            style={{ animationDelay: "200ms" }}
          >
            The homepage gives you the headline. Here&rsquo;s how it actually
            happened.
          </p>

          <div className="space-y-16">
            {chapters.map((chapter) => (
              <Reveal key={chapter.marker}>
                <section className="border-t border-line pt-8">
                  <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
                    {chapter.marker}
                  </p>
                  <h2 className="mb-5 font-display text-3xl leading-tight text-paper sm:text-4xl">
                    {chapter.title}
                  </h2>
                  {chapter.body.map((paragraph, i) => (
                    <p
                      key={i}
                      className="mb-4 leading-relaxed text-muted last:mb-0"
                    >
                      {paragraph}
                    </p>
                  ))}
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
