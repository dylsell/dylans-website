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
        setError("Incorrect password.");
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
        autoFocus
        className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
      />
      <button
        type="submit"
        disabled={submitting || !password}
        className="rounded-xl bg-indigo-500 px-4 py-3 text-white font-semibold hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Checking..." : "Enter"}
      </button>
      {error && <p className="text-rose-400 text-sm">{error}</p>}
    </form>
  );
}
