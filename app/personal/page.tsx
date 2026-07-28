import Link from "next/link";
import { cookies } from "next/headers";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import Gate from "./Gate";
import {
  normalizePersonalRedirect,
  PERSONAL_AUTH_COOKIE,
  verifyPersonalSessionToken,
} from "../../lib/personalAuth";

export default async function PersonalLanding({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const secret = process.env.PERSONAL_PASSWORD;
  const token = (await cookies()).get(PERSONAL_AUTH_COOKIE)?.value;
  const authed = await verifyPersonalSessionToken(token, secret);
  const { next } = await searchParams;
  const redirectTo = normalizePersonalRedirect(next);

  if (!authed) {
    return (
      <>
        <Nav />
        <main className="min-h-screen px-6 pt-36 pb-24 sm:px-10">
          <div className="mx-auto max-w-md">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-amber">
              Personal
            </p>
            <h1 className="mb-4 font-display text-6xl text-paper">
              The <em className="text-amber">lab.</em>
            </h1>
            <p className="mb-10 text-muted">
              Family-only builds live here. If you have the password, you know
              why.
            </p>
            <Gate redirectTo={redirectTo} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen px-6 pt-36 pb-24 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-amber">
            Personal
          </p>
          <h1 className="mb-4 font-display text-6xl text-paper">
            The <em className="text-amber">lab.</em>
          </h1>
          <p className="mb-12 text-muted">
            Things I&rsquo;ve built that aren&rsquo;t meant for the world —
            just for the people in mine.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/personal/kids"
              className="group block border border-line p-8 transition-colors hover:border-amber/40 hover:bg-ink-2"
            >
              <p className="mb-6 font-mono text-[11px] tracking-[0.2em] text-faint">
                01
              </p>
              <h2 className="font-display text-2xl text-paper transition-colors group-hover:text-amber">
                Bradley&rsquo;s games
              </h2>
              <p className="mt-2 text-sm text-muted">
                Arcade builds for my toughest stakeholder.
              </p>
              <p className="mt-6 font-mono text-sm text-faint transition-all group-hover:translate-x-1 group-hover:text-amber">
                →
              </p>
            </Link>
            <Link
              href="/personal/trading"
              className="group block border border-line p-8 transition-colors hover:border-amber/40 hover:bg-ink-2"
            >
              <p className="mb-6 font-mono text-[11px] tracking-[0.2em] text-faint">
                02
              </p>
              <h2 className="font-display text-2xl text-paper transition-colors group-hover:text-amber">
                SPX · Saty levels
              </h2>
              <p className="mt-2 text-sm text-muted">
                Live ATR levels, pivot ribbon, phase oscillator.
              </p>
              <p className="mt-6 font-mono text-sm text-faint transition-all group-hover:translate-x-1 group-hover:text-amber">
                →
              </p>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
