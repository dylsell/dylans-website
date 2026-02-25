import Link from "next/link";

const links = [
  { label: "Apps", href: "/kids" },
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
];

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-black/90 backdrop-blur-sm">
      <Link
        href="/"
        className="text-white font-black text-lg tracking-tight hover:text-indigo-400 transition-colors"
      >
        Dylan Sellberg
      </Link>
      <div className="flex items-center gap-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-zinc-400 hover:text-white text-sm font-semibold tracking-widest uppercase transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
