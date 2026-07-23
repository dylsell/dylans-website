import Link from "next/link";

const social = [
  { label: "LinkedIn", href: "https://linkedin.com/in/dylsell" },
  { label: "GitHub", href: "https://github.com/dylsell" },
  { label: "X", href: "https://x.com/dylsell" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-3xl text-paper sm:text-4xl">
              Building something real?
            </p>
            <a
              href="https://linkedin.com/in/dylsell"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-display text-3xl italic text-amber transition-colors hover:text-amber-bright sm:text-4xl"
            >
              Let&rsquo;s talk. ↗
            </a>
          </div>
          <div className="flex gap-6">
            {social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-paper"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Dylan Sellberg</p>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-amber"
              style={{ animation: "signalPulse 2.4s ease-in-out infinite" }}
            />
            <p>Redesigned by an AI agent · supervised by a human</p>
          </div>
          <Link
            href="/work"
            className="transition-colors hover:text-muted"
          >
            Shipped, not vibed
          </Link>
        </div>
      </div>
    </footer>
  );
}
