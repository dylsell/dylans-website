import Link from "next/link";
import Nav from "../../components/Nav";

const talks = [
  {
    year: "2023",
    id: "hT4NvY1vbK0",
    title: "Meet ChatSpot",
    event: "INBOUND 2023",
    location: "Boston, MA",
    label: "The AI Assistant Era Begins",
    description:
      "Six months after ChatGPT changed everything, Dylan took the INBOUND stage to introduce ChatSpot — HubSpot's answer to what AI for business actually looks like. Not a generic chatbot, but a CRM-native assistant that could research prospects, generate content, pull analytics, and run sales outreach through natural language alone. The \"CRM Command Line\" demo stopped the room. This was the moment HubSpot planted its flag in the AI era.",
    tags: ["AI Assistant", "CRM", "Natural Language", "ChatGPT Era"],
  },
  {
    year: "2024",
    id: "QP0SHDV_7Ts",
    title: "Meet Breeze",
    event: "INBOUND 2024",
    location: "Boston, MA",
    label: "Building the AI Platform",
    description:
      "A year later, Dylan returned with something bigger: Breeze — HubSpot's unified AI platform built on three pillars. Copilot brought a context-aware AI companion into every corner of HubSpot, across browser and mobile. Breeze Agents introduced autonomous AI specialists for content, social, prospecting, and customer service. Breeze Intelligence unified data from 80+ sources to give businesses a real-time view of their customers. 80 AI capabilities. One platform. Zero excuses for not using AI.",
    tags: ["AI Platform", "Copilot", "Agents", "Data Intelligence"],
  },
  {
    year: "2025",
    id: "qHXMlj6fdrI",
    title: "Breeze Agents: Your New Digital Teammates",
    event: "INBOUND 2025",
    location: "San Francisco, CA",
    label: "The Agentic Future",
    description:
      "By 2025, the conversation had shifted from AI tools to AI teammates. Dylan's INBOUND 2025 session introduced 20+ Breeze Agents purpose-built to work alongside sales, marketing, and service teams — prospecting, researching, responding, and closing without waiting to be asked. Alongside the launch of Breeze Studio and the Agent Marketplace, this talk marked the transition from AI-assisted work to AI-driven workflows. The future of CRM isn't software you use. It's agents that work for you.",
    tags: ["AI Agents", "Agentic AI", "Automation", "Agent Marketplace"],
  },
];

export default function ProductLaunchTalks() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-zinc-950 px-8 pt-28 pb-24">
        <div className="max-w-3xl mx-auto w-full">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors mb-10"
          >
            ← Work
          </Link>

          <p className="text-indigo-400 font-semibold tracking-widest uppercase text-sm mb-3">
            Speaking
          </p>
          <h1 className="text-5xl font-black text-white mb-3">
            Product Launch Talks
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mb-16">
            Three years on the INBOUND main stage, launching AI products that
            defined how a generation of businesses adopted artificial intelligence.
          </p>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[52px] top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/60 via-indigo-500/30 to-transparent" />

            <div className="flex flex-col gap-16">
              {[...talks].reverse().map((talk, i) => (
                <div key={talk.id} className="relative flex gap-8">
                  {/* Year badge */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 104 }}>
                    <div
                      className="relative z-10 flex items-center justify-center rounded-full font-black text-sm tabular-nums"
                      style={{
                        width: 52,
                        height: 52,
                        background: i === 2
                          ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                          : i === 1
                          ? "linear-gradient(135deg, #4f46e5, #3730a3)"
                          : "linear-gradient(135deg, #3730a3, #1e1b4b)",
                        boxShadow: "0 0 0 4px #09090b, 0 0 20px rgba(99,102,241,0.3)",
                        color: "white",
                      }}
                    >
                      {talk.year}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    {/* Label */}
                    <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">
                      {talk.label}
                    </p>

                    {/* Title + event */}
                    <h2 className="text-2xl font-black text-white mb-1">
                      {talk.title}
                    </h2>
                    <p className="text-zinc-500 text-sm mb-4">
                      {talk.event} · {talk.location}
                    </p>

                    {/* Video embed */}
                    <div
                      className="relative w-full rounded-2xl overflow-hidden bg-zinc-900 mb-5 shadow-xl"
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

                    {/* Description */}
                    <p className="text-zinc-300 leading-relaxed mb-5">
                      {talk.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {talk.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-semibold px-3 py-1 rounded-full text-indigo-300 border border-indigo-500/30 bg-indigo-500/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
