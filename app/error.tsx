"use client";

import { useEffect } from "react";
import Link from "next/link";

/* Shown when a page fails to load (for example the database is briefly unreachable). Offers a retry. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main lang="de" className="paper flex min-h-[100dvh] items-center px-4 py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-sage">Kurze Panne · Something went wrong</p>
        <h1 className="display mt-3 text-[clamp(2.5rem,6vw,4rem)] leading-none text-amber">Da hakt gerade etwas.</h1>
        <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-bone/85">
          Die Seite konnte nicht geladen werden. Bitte gleich noch einmal versuchen.
        </p>
        <p lang="en" className="mt-2 max-w-[60ch] text-base leading-relaxed text-bone/60">
          This page couldn&apos;t load. Please try again in a moment.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center rounded-full bg-amber px-6 font-medium text-chrome transition-colors hover:bg-route"
          >
            Noch einmal versuchen
          </button>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-full px-6 text-sage ring-1 ring-inset ring-bone/20 transition-colors hover:text-bone">
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
