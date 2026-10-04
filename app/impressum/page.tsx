import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import { getSite } from "@/lib/store";

export const metadata: Metadata = {
  title: "Impressum | Paulaner Meets Route 66",
};

/*
  Anbieterkennzeichnung nach § 5 DDG. Name, Anschrift und Kontakt kommen aus
  der Verwaltung („Bar & Sicherung“), damit sie an einer Stelle gepflegt werden.
*/
export default async function ImprintPage() {
  await connection();
  const { venue } = await getSite();
  return (
    <LegalShell>
      <h1 className="display mt-10 text-[clamp(2.5rem,6vw,4rem)] leading-none text-amber">Impressum</h1>

      <section className="mt-10 space-y-3 text-base leading-relaxed text-bone/85">
        <h2 className="display text-2xl text-bone">Angaben gemäß § 5 DDG</h2>
        <p>
          {venue.name}
          {venue.contactName && (
            <>
              <br />
              Inhaber: {venue.contactName}
            </>
          )}
          <br />
          {venue.street}
          <br />
          {venue.city}
        </p>
      </section>

      <section className="mt-10 space-y-3 text-base leading-relaxed text-bone/85">
        <h2 className="display text-2xl text-bone">Kontakt</h2>
        <p>
          {venue.phone && (
            <>
              Telefon:{" "}
              <a href={`tel:${venue.phone.replace(/[^+\d]/g, "")}`} className="underline underline-offset-4">
                {venue.phone}
              </a>
              <br />
            </>
          )}
          {venue.email ? (
            <>
              E-Mail:{" "}
              <a href={`mailto:${venue.email}`} className="underline underline-offset-4">
                {venue.email}
              </a>
            </>
          ) : (
            !venue.phone && <>Kontakt persönlich in der Bar, {venue.street}.</>
          )}
        </p>
      </section>

      <section className="mt-10 space-y-3 text-base leading-relaxed text-bone/85">
        <h2 className="display text-2xl text-bone">Verbraucherstreitbeilegung</h2>
        <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </section>

      <section className="mt-10 space-y-3 text-base leading-relaxed text-bone/85">
        <h2 className="display text-2xl text-bone">Bildnachweise</h2>
        <p>
          Fotos: <a href="https://unsplash.com" className="underline underline-offset-4">Unsplash</a> (Unsplash-Lizenz). Die Marken Paulaner und Route 66
          gehören ihren jeweiligen Inhabern.
        </p>
      </section>

      <p className="mt-10 text-sm text-sage">
        Wie wir mit euren Daten umgehen, steht in der{" "}
        <Link href="/datenschutz" className="underline underline-offset-4">
          Datenschutzerklärung
        </Link>
        .
      </p>
    </LegalShell>
  );
}
