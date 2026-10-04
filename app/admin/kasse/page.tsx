import Link from "next/link";
import { CaretLeft, CaretRight, Coins, HandCoins, Receipt, Timer, User, X } from "@phosphor-icons/react/dist/ssr";
import BarChart, { type BarDatum } from "@/components/admin/BarChart";
import LiveRefresh from "@/components/admin/LiveRefresh";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { getTab, listTabs, paymentsOn, stats, type TabDetail, type TabSummary } from "@/lib/deckel";
import { addDays, clock, day, duration, eur, METHOD_LABEL, minutesSince, TAB_STATUS } from "@/lib/deckel-format";
import { berlinNow } from "@/lib/hours";

/*
  Everything the tablets and phones record, as it happens: open tabs right now,
  the day's payments and closed tabs, and the day's figures. Refreshes itself.
*/

function Kpi({ label, value, sub, Icon }: { label: string; value: string; sub: string; Icon: typeof Coins }) {
  return (
    <Card className="flex flex-col gap-3">
      <span className="flex items-center gap-2 text-sm text-sage">
        <Icon size={18} weight="duotone" className="text-amber" aria-hidden="true" /> {label}
      </span>
      <span className="display text-4xl leading-none text-bone tabular-nums md:text-5xl">{value}</span>
      <span className="text-sm text-sage">{sub}</span>
    </Card>
  );
}

function StatusPill({ status }: { status: TabSummary["status"] }) {
  const meta = TAB_STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

function TabDetailCard({ tab, closeHref }: { tab: TabDetail; closeHref: string }) {
  return (
    <Card
      className="mb-4 ring-2 ring-amber/40"
      title={
        <span className="flex flex-wrap items-center gap-3">
          <span className="display text-2xl">
            Nr. {tab.number} · {tab.label}
          </span>
          <StatusPill status={tab.status} />
        </span>
      }
      action={
        <Link href={closeHref} scroll={false} className="rounded-full p-2 text-sage transition-colors hover:bg-night hover:text-bone" aria-label="Schließen">
          <X size={18} />
        </Link>
      }
    >
      <p className="mb-4 text-sm text-sage">
        {tab.table ? `Tisch ${tab.table} · ` : ""}
        {tab.customer ? `Gast: ${tab.customer.name} · ` : ""}
        {tab.mode === "pay_as_you_go" ? "Sofort zahlen" : "Später zahlen"} · geöffnet {clock(tab.openedAt)} von {tab.openedBy || "–"}
        {tab.closedAt ? ` · geschlossen ${clock(tab.closedAt)}` : ""}
      </p>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h3 className="label mb-2 text-xs text-sage">Getränke</h3>
          {tab.items.length === 0 ? (
            <p className="text-sm text-sage">Noch nichts gebucht.</p>
          ) : (
            <ul className="divide-y divide-bone/[0.06]">
              {tab.items.map((i) => (
                <li key={i.id} className={`flex items-baseline gap-3 py-2 text-sm ${i.voided ? "text-sage line-through" : ""}`}>
                  <span className="w-8 shrink-0 font-mono font-semibold">{i.qty}×</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{i.name}</span> <span className="text-sage">{i.size}</span>
                    <span className="block text-xs text-sage no-underline">
                      {clock(i.addedAt)} · {i.addedBy || "–"}
                      {i.onHouse && " · aufs Haus"}
                      {i.voided && ` · storniert${i.voidReason ? `: ${i.voidReason}` : ""}`}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">{i.onHouse ? <s>{eur(i.unitPriceCents * i.qty)}</s> : eur(i.unitPriceCents * i.qty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="label mb-2 text-xs text-sage">Zahlungen</h3>
          {tab.payments.length === 0 ? (
            <p className="text-sm text-sage">Noch nichts bezahlt.</p>
          ) : (
            <ul className="divide-y divide-bone/[0.06]">
              {tab.payments.map((p) => (
                <li key={p.id} className={`flex items-baseline justify-between gap-3 py-2 text-sm ${p.refunded ? "text-sage line-through" : ""}`}>
                  <span>
                    {METHOD_LABEL[p.method]} · {clock(p.takenAt)}
                    <span className="block text-xs text-sage">
                      {p.takenBy || "–"}
                      {p.tipCents > 0 && ` · Trinkgeld ${eur(p.tipCents)}`}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-emerald-800">{eur(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-4 space-y-1 border-t border-dashed border-bone/20 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-sage">Summe</dt>
              <dd className="font-mono tabular-nums">{eur(tab.totalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sage">Bezahlt</dt>
              <dd className="font-mono tabular-nums text-emerald-800">{eur(tab.paidCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <dt className="display text-xl">Offen</dt>
              <dd className={`font-mono text-2xl font-semibold tabular-nums ${tab.balanceCents > 0 ? "text-amber" : "text-emerald-800"}`}>{eur(tab.balanceCents)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Card>
  );
}

export default async function KassePage({ searchParams }: { searchParams: Promise<{ date?: string; tab?: string }> }) {
  await requireOwner();
  const params = await searchParams;
  const today = berlinNow().date;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today ? params.date : today;
  const isToday = date === today;
  const href = (next: { date?: string; tab?: string | null }) => {
    const q = new URLSearchParams();
    const d = next.date ?? date;
    if (d !== today) q.set("date", d);
    const t = next.tab === undefined ? params.tab : next.tab;
    if (t) q.set("tab", t);
    const s = q.toString();
    return `/admin/kasse${s ? `?${s}` : ""}`;
  };

  const [open, closed, payments, figures, selected] = await Promise.all([
    listTabs({ status: "open" }),
    listTabs({ status: "closed_on", date }),
    paymentsOn(date),
    stats(date, date),
    params.tab ? getTab(params.tab).catch(() => null) : Promise.resolve(null),
  ]);

  const openBalance = open.reduce((n, t) => n + t.balanceCents, 0);
  const hours: BarDatum[] = Array.from({ length: 24 }, (_, i) => (i + 12) % 24)
    .map((h) => ({ hour: h, amount: figures.hourly.find((x) => x.hour === h)?.amount ?? 0 }))
    // Only the stretch of the day that saw payments, padded by an hour either side.
    .filter((_, i, all) => {
      const first = all.findIndex((x) => x.amount > 0);
      const last = all.findLastIndex((x) => x.amount > 0);
      return first >= 0 && i >= first - 1 && i <= last + 1;
    })
    .map(({ hour, amount }) => ({
      key: String(hour),
      label: `${hour}`,
      detail: `${hour}:00–${(hour + 1) % 24}:00 Uhr`,
      value: Math.round(amount / 100),
      sub: eur(amount),
    }));
  const methodMax = Math.max(1, ...figures.byMethod.map((m) => m.amount));
  const drinkMax = Math.max(1, ...figures.topDrinks.map((d) => d.qty));

  return (
    <>
      <PageHeader
        title="Live-Kasse"
        description="Alles, was an den Tablets und Handys gebucht wird: offene Deckel in Echtzeit, Zahlungen und abgeschlossene Deckel des Tages."
        actions={<LiveRefresh seconds={5} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href={href({ date: addDays(date, -1), tab: null })} className="rounded-full bg-white p-2.5 ring-1 ring-bone/10 transition-colors hover:bg-night" aria-label="Vorheriger Tag">
          <CaretLeft size={16} />
        </Link>
        <span className="min-w-[14ch] text-center font-medium">{isToday ? `Heute, ${day(date).split(", ")[1]}` : day(date)}</span>
        {!isToday && (
          <>
            <Link href={href({ date: addDays(date, 1), tab: null })} className="rounded-full bg-white p-2.5 ring-1 ring-bone/10 transition-colors hover:bg-night" aria-label="Nächster Tag">
              <CaretRight size={16} />
            </Link>
            <Link href={href({ date: today, tab: null })} className="ml-1 text-sm font-medium text-amber">
              Zu heute
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={isToday ? "Umsatz heute" : "Umsatz"} value={eur(figures.revenueCents)} sub={`${figures.paymentCount} ${figures.paymentCount === 1 ? "Zahlung" : "Zahlungen"}`} Icon={Coins} />
        <Kpi label="Trinkgeld" value={eur(figures.tipsCents)} sub={figures.voids.count ? `${figures.voids.count} Stornos (${eur(figures.voids.amountCents)})` : "keine Stornos"} Icon={HandCoins} />
        <Kpi label="Offene Deckel" value={String(open.length)} sub={`${eur(openBalance)} noch offen`} Icon={Receipt} />
        <Kpi label="Angeschrieben" value={eur(figures.debts.balanceCents)} sub={`${figures.debts.guests} ${figures.debts.guests === 1 ? "Gast" : "Gäste"}`} Icon={User} />
      </div>

      <div className="mt-4">{selected && <TabDetailCard tab={selected} closeHref={href({ tab: null })} />}</div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={`Offene Deckel jetzt (${open.length})`} className="lg:col-span-2">
          {open.length === 0 ? (
            <p className="text-sm text-sage">Gerade ist kein Deckel offen.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {open.map((t) => {
                const minutes = minutesSince(t.openedAt);
                const active = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <Link
                      href={href({ tab: t.id })}
                      scroll={false}
                      className={`block rounded-2xl p-4 ring-1 transition-colors ${active ? "bg-asphalt text-chrome ring-asphalt" : "bg-night/40 ring-bone/[0.06] hover:bg-night"}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            <span className={active ? "text-chrome/60" : "text-sage"}>#{t.number}</span> {t.label}
                          </span>
                          <span className={`mt-0.5 flex flex-wrap gap-x-2 text-xs ${active ? "text-chrome/60" : "text-sage"}`}>
                            {t.table && <span>Tisch {t.table}</span>}
                            {t.customer && <span>{t.customer.name}</span>}
                            <span className={`inline-flex items-center gap-1 ${minutes > 180 ? "font-semibold text-[#8a5a10]" : ""}`}>
                              <Timer size={12} /> {duration(minutes)}
                            </span>
                          </span>
                        </span>
                        <span className="text-right">
                          <span className={`block font-mono font-semibold tabular-nums ${active ? "" : t.balanceCents > 0 ? "text-amber" : "text-emerald-800"}`}>{eur(t.balanceCents)}</span>
                          <span className={`text-xs ${active ? "text-chrome/60" : "text-sage"}`}>
                            {t.itemCount} {t.itemCount === 1 ? "Getränk" : "Getränke"}
                          </span>
                        </span>
                      </span>
                      <span className={`mt-2 block text-xs ${active ? "text-chrome/50" : "text-sage"}`}>
                        {t.mode === "pay_as_you_go" ? "Sofort zahlen" : "Später zahlen"} · {t.openedBy || "–"} · seit {clock(t.openedAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Zahlungen (${payments.length})`}>
          {payments.length === 0 ? (
            <p className="text-sm text-sage">{isToday ? "Heute wurde noch nichts kassiert." : "An diesem Tag wurde nichts kassiert."}</p>
          ) : (
            <ul className="max-h-[520px] divide-y divide-bone/[0.06] overflow-y-auto pr-1">
              {payments.map((p) => (
                <li key={p.id} className={`flex items-baseline justify-between gap-3 py-2.5 text-sm ${p.refunded ? "text-sage line-through" : ""}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {p.tabId ? (
                        <Link href={href({ tab: p.tabId })} scroll={false} className="hover:text-amber">
                          #{p.tabNumber} {p.tabLabel}
                        </Link>
                      ) : (
                        `Schulden: ${p.customerName ?? "Gast"}`
                      )}
                    </span>
                    <span className="block text-xs text-sage">
                      {clock(p.takenAt)} · {METHOD_LABEL[p.method]} · {p.takenBy || "–"}
                      {p.tipCents > 0 && ` · +${eur(p.tipCents)} Trinkgeld`}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-emerald-800">{eur(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Umsatz nach Uhrzeit (€)" className="lg:col-span-2">
          {hours.length ? <BarChart data={hours} units={["€", "€"]} height={200} /> : <p className="text-sm text-sage">Noch keine Zahlungen.</p>}
        </Card>
        <Card title="Nach Zahlart">
          {figures.byMethod.length === 0 ? (
            <p className="text-sm text-sage">Noch keine Zahlungen.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {figures.byMethod.map((m) => (
                <li key={m.method} className="text-sm">
                  <span className="flex justify-between">
                    <span>
                      {METHOD_LABEL[m.method]} <span className="text-sage">· {m.count}×</span>
                    </span>
                    <span className="font-mono tabular-nums">{eur(m.amount)}</span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-night">
                    <span className="block h-full rounded-full bg-route" style={{ width: `${(m.amount / methodMax) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`Abgeschlossen (${closed.length})`}>
          {closed.length === 0 ? (
            <p className="text-sm text-sage">Noch kein Deckel abgeschlossen.</p>
          ) : (
            <ul className="max-h-[460px] divide-y divide-bone/[0.06] overflow-y-auto pr-1">
              {closed.map((t) => (
                <li key={t.id}>
                  <Link href={href({ tab: t.id })} scroll={false} className="flex items-center gap-3 py-2.5 text-sm hover:text-amber">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        #{t.number} {t.label}
                      </span>
                      <span className="block text-xs text-sage">
                        {clock(t.openedAt)}–{clock(t.closedAt)}
                        {t.customer && ` · ${t.customer.name}`}
                      </span>
                    </span>
                    <StatusPill status={t.status} />
                    <span className="w-20 text-right font-mono tabular-nums">{eur(t.totalCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Meistverkauft">
          {figures.topDrinks.length === 0 ? (
            <p className="text-sm text-sage">Noch nichts verkauft.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {figures.topDrinks.map((d, i) => (
                <li key={`${d.name}-${d.size}`} className="text-sm">
                  <span className="flex justify-between gap-3">
                    <span className="truncate">
                      <span className="mr-2 font-mono text-sage">{i + 1}</span>
                      {d.name} <span className="text-sage">{d.size}</span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {d.qty}× · {eur(d.revenue)}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-night">
                    <span className="block h-full rounded-full bg-amber" style={{ width: `${(d.qty / drinkMax) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
