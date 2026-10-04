import { PageHeader } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { getActivity } from "@/lib/store";

/* Every change made through the portal, newest first. */
export default async function ActivityPage() {
  await requireOwner();
  const entries = await getActivity(400);
  const byDay = new Map<string, typeof entries>();
  for (const entry of entries) {
    const day = new Date(entry.at).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }

  return (
    <>
      <PageHeader title="Protokoll" description="Wer hat wann was geändert. Einträge werden nach zwölf Monaten automatisch gelöscht." />
      {entries.length === 0 ? (
        <p className="text-sage">Noch nichts protokolliert.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {[...byDay.entries()].map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-3 text-sm font-semibold">{day}</h2>
              <ol className="relative flex flex-col gap-1 border-l-2 border-bone/10 pl-5">
                {items.map((entry) => (
                  <li key={entry.id} className="relative rounded-2xl bg-white px-4 py-3 ring-1 ring-bone/[0.06]">
                    <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-[#efe4d6] bg-amber" aria-hidden="true" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{entry.action}</p>
                      <time className="font-mono text-xs text-sage" dateTime={entry.at}>
                        {new Date(entry.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
                      </time>
                    </div>
                    {(entry.detail || entry.userEmail) && (
                      <p className="mt-0.5 break-words text-sm text-sage">
                        {entry.detail}
                        {entry.detail && entry.userEmail && " · "}
                        {entry.userEmail}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
