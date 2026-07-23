import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dylansellberg.com"),
  title: {
    default: "Dylan Sellberg — I teach software to do the work",
    template: "%s — Dylan Sellberg",
  },
  description:
    "Product leader for the AI era. Led HubSpot's flagship AI launches — ChatSpot, Breeze, Breeze Agents — now building the agent platform at Samsara for the people who keep the physical world running.",
  openGraph: {
    title: "Dylan Sellberg — I teach software to do the work",
    description:
      "Product leader for the AI era. Three patents, three main-stage launches, and AI that rides shotgun with the people who keep the physical world running.",
    url: "https://dylansellberg.com",
    siteName: "Dylan Sellberg",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@dylsell",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable} ${instrument.variable} antialiased grain`}
      >
        {children}
      </body>
    </html>
  );
}
