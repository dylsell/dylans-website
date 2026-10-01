import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bradley’s Keeper Cup",
  description: "Bradley is Team USA’s goalkeeper. Catch the Netherlands’ shots, build your skills, and win the Keeper Cup.",
};

export default function SoccerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
