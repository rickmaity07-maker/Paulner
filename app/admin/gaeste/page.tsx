import Link from "next/link";
import { MagnifyingGlass, Star, X } from "@phosphor-icons/react/dist/ssr";
import LiveRefresh from "@/components/admin/LiveRefresh";
import { Card, FIELD, PageHeader } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { getCustomer, listCustomers } from "@/lib/deckel";
import { berlinDate, clock, eur, METHOD_LABEL, shortDate, TAB_STATUS } from "@/lib/deckel-format";

/* The guests the bar keeps tabs for: who owes what, who comes often, what they drink. Read-only, live. */

const FILTERS = [
  { key: "", label: "Alle" },
  { key: "owing", label: "Mit Schulden" },
  { key: "regulars", label: "Stammgäste" },
] as const;

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; id?: string }> }) {
  await requireOwner();
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 80);
  const filter = params.filter === "owing" || params.filter === "regulars" ? params.filter : "";
  const href = (next: { filter?: string; id?: string | null }) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    const f = next.filter ?? filter;
    if (f) s.set("filter", f);
    const id = next.id === undefined ? params.id : next.id;
    if (id) s.set("id", id);
    const str = s.toString();
    return `/admin/gaeste${str ? `?${str}` : ""}`;
  };

  const [all, guest] = await Promise.all([
    listCustomers(q, { owing: filter === "owing" }),
    params.id ? getCustomer(params.id).catch(() => null) : Promise.resolve(null),
  ]);
  const guests = filter === "regulars" ? all.filter((c) => c.regular) : all;
  const owed = all.reduce((n, c) => n + Math.max(0, c.balanceCents), 0);

  return (
    <>
      <PageHeader
        title="Gäste & Schulden"
        description="Die Gäste aus der Deckel-App: offene Beträge, Stammgäste, Lieblingsgetränke und jeder Deckel. Angelegt und abgerechnet wird an Tablet oder Handy."
        actions={<LiveRefresh seconds={10} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card
          title={`${guests.length} ${guests.length === 1 ? "Gast" : "Gäste"}`}
          action={owed > 0 && <span className="text-sm text-sage">zusammen {eur(owed)} offen</span>}
        >
          <form className="relative mb-3" action="/admin/gaeste">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
            <input name="q" defaultValue={q} placeholder="Name, Telefon, E-Mail …" className={`${FIELD} pl-10`} aria-label="Gäste suchen" />
            {filter && <input type="hidden" name="filter" value={filter} />}
          </form>
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={href({ filter: f.key, id: null })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors ${filter === f.key ? "bg-asphalt text-chrome ring-asphalt" : "bg-white text-bone ring-bone/12 hover:bg-night"}`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          {guests.length === 0 ? (
            <p className="text-sm text-sage">Keine Gäste gefunden.</p>
          ) : (
            <ul className="max-h-[640px] divide-y divide-bone/[0.06] overflow-y-auto pr-1">
              {guests.map((c) => (
                <li key={c.id}>
                  <Link
                    href={href({ id: c.id })}
                    scroll={false}
                    className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm transition-colors ${guest?.id === c.id ? "bg-night" : "hover:bg-night/60"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="truncate">{c.name}</span>
                        {c.regular && <Star size={13} weight="fill" className="shrink-0 text-gold" aria-label="Stammgast" />}
                      </span>
                      <span className="block truncate text-xs text-sage">
                        {[c.phone, c.openTabId ? "hat einen offenen Deckel" : c.lastVisitAt ? `zuletzt ${shortDate(c.lastVisitAt)}` : "noch kein Besuch"].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {c.balanceCents > 0 && <span className="font-mono font-semibold tabular-nums text-amber">{eur(c.balanceCents)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {guest ? (
          <Card
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span className="display text-2xl">{guest.name}</span>
                {guest.regular && <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-asphalt">Stammgast</span>}
              </span>
            }
            action={
              <Link href={href({ id: null })} scroll={false} className="rounded-full p-2 text-sage hover:bg-night hover:text-bone" aria-label="Schließen">
                <X size={18} />
              </Link>
            }
          >
            <p className="text-sm text-sage">
              {[guest.phone, guest.email, `seit ${shortDate(guest.createdAt)}`].filter(Boolean).join(" · ")}
            </p>
            {guest.note && <p className="mt-1 text-sm text-route">„{guest.note}“</p>}

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Offen", eur(guest.balanceCents), guest.balanceCents > 0 ? "text-amber" : "text-emerald-800"],
                ["Umsatz", eur(guest.totalSpentCents), ""],
                ["Besuche", String(guest.visits), ""],
                ["Kreditlimit", guest.creditLimitCents ? eur(guest.creditLimitCents) : "keins", ""],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-2xl bg-night/50 p-3">
                  <dt className="label text-[10px] text-sage">{label}</dt>
                  <dd className={`mt-1 font-mono text-lg font-semibold tabular-nums ${tone}`}>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="label mb-2 text-xs text-sage">Trinkt am liebsten</h3>
                {guest.favourites.length === 0 ? (
                  <p className="text-sm text-sage">Noch keine Getränke.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {guest.favourites.map((f) => (
                      <li key={`${f.name}-${f.size}`} className="flex justify-between">
                        <span>
                          {f.name} <span className="text-sage">{f.size}</span>
                        </span>
                        <span className="text-sage">{f.qty}×</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="label mb-2 text-xs text-sage">Zahlungen</h3>
                {guest.payments.length === 0 ? (
                  <p className="text-sm text-sage">Noch keine Zahlungen.</p>
                ) : (
                  <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1 text-sm">
                    {guest.payments.map((p) => (
                      <li key={p.id} className={`flex justify-between gap-2 ${p.refunded ? "text-sage line-through" : ""}`}>
                        <span>
                          {shortDate(p.takenAt)} {clock(p.takenAt)} · {METHOD_LABEL[p.method]}
                          {!p.tabId && " · Schulden beglichen"}
                        </span>
                        <span className="font-mono tabular-nums text-emerald-800">{eur(p.amountCents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <h3 className="label mb-2 mt-6 text-xs text-sage">Deckel</h3>
            {guest.tabs.length === 0 ? (
              <p className="text-sm text-sage">Noch kein Deckel.</p>
            ) : (
              <ul className="divide-y divide-bone/[0.06]">
                {guest.tabs.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/kasse?${new URLSearchParams({ ...(t.status === "open" ? {} : { date: berlinDate(t.closedAt ?? t.openedAt) }), tab: t.id })}`}
                      className="flex items-center gap-3 py-2 text-sm hover:text-amber"
                    >
                      <span className="w-28 shrink-0">{shortDate(t.openedAt)}</span>
                      <span className="min-w-0 flex-1 truncate text-sage">
                        #{t.number} · {t.itemCount} {t.itemCount === 1 ? "Getränk" : "Getränke"}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TAB_STATUS[t.status].className}`}>{TAB_STATUS[t.status].label}</span>
                      <span className="w-20 text-right font-mono tabular-nums">{eur(t.totalCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card>
            <p className="py-10 text-center text-sm text-sage">Einen Gast links auswählen.</p>
          </Card>
        )}
      </div>
    </>
  );
}
