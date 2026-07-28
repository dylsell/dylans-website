"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Gate({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/personal-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          res.status === 503 || body?.error === "not_configured"
            ? "Access isn’t configured on the live site yet."
            : "That password didn’t match.",
        );
        setSubmitting(false);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        autoFocus
        className="border border-line bg-ink-2 px-4 py-3 font-mono text-sm text-paper placeholder-faint transition-colors focus:border-amber/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting || !password}
        className="border border-amber/60 bg-amber/10 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-amber transition-colors hover:bg-amber hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Checking…" : "Enter"}
      </button>
      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
