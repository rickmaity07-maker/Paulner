import "server-only";
import { db, hasDatabase } from "@/lib/db";

export interface AppRelease {
  id: string;
  versionCode: number;
  versionName: string;
  url: string;
  sha256: string;
  sizeBytes: number;
  notes: string;
  notesEn: string;
  mandatory: boolean;
  published: boolean;
  createdAt: string;
}

const toRelease = (r: Record<string, unknown>): AppRelease => ({
  id: r.id as string,
  versionCode: r.version_code as number,
  versionName: r.version_name as string,
  url: r.url as string,
  sha256: r.sha256 as string,
  sizeBytes: Number(r.size_bytes),
  notes: r.notes as string,
  notesEn: r.notes_en as string,
  mandatory: r.mandatory as boolean,
  published: r.published as boolean,
  createdAt: new Date(r.created_at as string).toISOString(),
});

export async function listReleases(): Promise<AppRelease[]> {
  if (!hasDatabase()) return [];
  const rows = (await db()`select * from app_releases order by version_code desc limit 50`) as Record<string, unknown>[];
  return rows.map(toRelease);
}

/*
  What a tablet on `current` should do: the newest published version, and the
  oldest version still allowed to run (anything below the newest mandatory one).
*/
export async function updateInfo(current: number) {
  const releases = (await listReleases()).filter((r) => r.published);
  const latest = releases[0] ?? null;
  const minSupported = releases.filter((r) => r.mandatory).reduce((min, r) => Math.max(min, r.versionCode), 0);
  return {
    latest: latest && latest.versionCode > current ? latest : null,
    minSupportedVersionCode: minSupported,
    mustUpdate: latest !== null && current < minSupported,
  };
}
