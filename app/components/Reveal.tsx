"use client";

import { useEffect, useRef } from "react";

/**
 * Fades children up on first scroll into view. Content stays visible
 * without JS — the pending class is only applied after mount.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Backgrounded documents never fire IntersectionObserver — show as-is.
    if (document.visibilityState === "hidden") return;

    const rect = el.getBoundingClientRect();
    if (rect.top >= window.innerHeight * 0.92) {
      el.classList.add("reveal-pending");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.remove("reveal-pending");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
