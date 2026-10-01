import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Bradley’s Space Rescue",
  description: "Captain Bradley blasts through four alien worlds to rescue Nelly, Logan, Dad Dylan, and Mom Beth. Drag, dodge, and power up!",
};
export default function SpaceLayout({ children }: { children: React.ReactNode }) { return children; }
