"use client";

import { DownloadSimple, ShieldCheck } from "@phosphor-icons/react";
import { setReleaseFlags } from "@/app/admin/actions";
import { Card, PageHeader, Toggle, useAction } from "@/components/admin/ui";
import type { AppRelease } from "@/lib/app-releases";

const stamp = (iso: string) => new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/* Every published version of the Deckel tablet app; the tablets update themselves to the newest one. */
export default function ReleasesManager({ releases }: { releases: AppRelease[] }) {
  const { pending, run } = useAction();
  const latest = releases.find((r) => r.published);

  return (
    <>
      <PageHeader
        title="Tablet-App"
        description="Die Deckel-App aktualisiert sich selbst: Beim Start und alle 30 Minuten fragt jedes Tablet nach einer neuen Version, lädt sie herunter, prüft sie und installiert sie nach einem Tipp. Ein Pflicht-Update sperrt ältere Versionen, bis aktualisiert wurde."
      />

      {latest ? (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-sage">Aktuelle Version</p>
              <p className="display text-4xl">{latest.versionName}</p>
              <p className="text-sm text-sage">
                Build {latest.versionCode} · {megabytes(latest.sizeBytes)} · {stamp(latest.createdAt)}
              </p>
            </div>
            <a
              href={latest.url}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-amber px-6 text-sm font-medium text-chrome transition-colors hover:bg-[#9a1a31]"
            >
              <DownloadSimple size={18} /> APK herunterladen
            </a>
          </div>
          <p className="mt-4 text-sm text-sage">
            Für ein neues Tablet: diese Datei auf dem Tablet öffnen und „Installieren“ antippen (einmalig „Aus dieser Quelle zulassen“ erlauben). Alle
            späteren Versionen kommen automatisch.
          </p>
        </Card>
      ) : (
        <Card className="mb-6">
          <p className="text-sage">Noch keine Version veröffentlicht.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {releases.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">
                  {r.versionName} <span className="font-normal text-sage">· Build {r.versionCode}</span>
                </p>
                <p className="text-sm text-sage">
                  {stamp(r.createdAt)} · {megabytes(r.sizeBytes)}
                </p>
                {r.notes && <p className="mt-2 whitespace-pre-line">{r.notes}</p>}
                <p className="mt-2 inline-flex items-center gap-1.5 break-all font-mono text-xs text-sage">
                  <ShieldCheck size={14} /> SHA-256 {r.sha256}
                </p>
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <label className="flex items-center justify-between gap-4">
                  Veröffentlicht
                  <Toggle label={`${r.versionName} veröffentlicht`} checked={r.published} disabled={pending} onChange={(published) => run(() => setReleaseFlags(r.id, { published }))} />
                </label>
                <label className="flex items-center justify-between gap-4">
                  Pflicht-Update
                  <Toggle label={`${r.versionName} Pflicht-Update`} checked={r.mandatory} disabled={pending} onChange={(mandatory) => run(() => setReleaseFlags(r.id, { mandatory }))} />
                </label>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
