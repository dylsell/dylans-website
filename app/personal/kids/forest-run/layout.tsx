import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Bradley’s Forest Run",
  description: "A little explorer. A big adventure. Help Bradley jump, collect stars, and reach Starlight Summit.",
};
export default function ForestLayout({ children }: { children: React.ReactNode }) { return children; }
