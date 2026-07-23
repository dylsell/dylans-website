"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Work", href: "/work", index: "01" },
  { label: "About", href: "/about", index: "02" },
  { label: "Personal", href: "/personal", index: "03" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-paper transition-colors hover:text-amber"
        >
          Dylan&nbsp;Sellberg
        </Link>
        <div className="flex items-center gap-4 sm:gap-9">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group font-mono text-[11px] uppercase tracking-[0.12em] transition-colors sm:tracking-[0.2em] ${
                  active ? "text-paper" : "text-muted hover:text-paper"
                }`}
              >
                <span
                  className={`mr-1.5 hidden transition-colors sm:inline ${
                    active ? "text-amber" : "text-faint group-hover:text-amber"
                  }`}
                >
                  {link.index}
                </span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
