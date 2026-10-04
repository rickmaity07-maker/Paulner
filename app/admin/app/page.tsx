import ReleasesManager from "@/components/admin/ReleasesManager";
import { listReleases } from "@/lib/app-releases";
import { requireOwner } from "@/lib/auth";

export default async function AppPage() {
  await requireOwner();
  return <ReleasesManager releases={await listReleases()} />;
}
