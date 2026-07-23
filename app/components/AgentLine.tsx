"use client";

import { useEffect, useState } from "react";

const lines = [
  "shipping: AI agents for the physical economy @ samsara",
  "previously: taught a CRM to talk — chatspot, breeze, 3 keynotes",
  "weekends: arcade games for a kid with strong opinions",
  "status: building things since age 11 — no plans to stop",
];

const TYPE_MS = 34;
const HOLD_MS = 2600;
const GAP_MS = 350;

/**
 * A terminal-style status line that types through rotating entries.
 * Reduced motion (or no JS) shows the first line statically.
 */
export default function AgentLine() {
  const [text, setText] = useState(lines[0]);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimate(true);

    let line = 0;
    let char = lines[0].length;
    let phase: "typing" | "holding" | "clearing" = "holding";
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (phase === "holding") {
        phase = "clearing";
        timer = setTimeout(tick, GAP_MS);
        setText("");
        char = 0;
        return;
      }
      if (phase === "clearing") {
        line = (line + 1) % lines.length;
        phase = "typing";
      }
      char += 1;
      setText(lines[line].slice(0, char));
      if (char >= lines[line].length) {
        phase = "holding";
        timer = setTimeout(tick, HOLD_MS);
      } else {
        timer = setTimeout(tick, TYPE_MS);
      }
    };

    timer = setTimeout(tick, HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <p className="font-mono text-[13px] tracking-tight text-muted sm:text-sm">
      <span className="mr-2 select-none text-amber">&gt;</span>
      {text}
      <span
        aria-hidden
        className="ml-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] bg-amber"
        style={animate ? { animation: "cursorBlink 1.1s step-end infinite" } : undefined}
      />
    </p>
  );
}
