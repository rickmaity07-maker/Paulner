import TapsEditor from "@/components/admin/TapsEditor";
import { requireOwner } from "@/lib/auth";
import { getSite } from "@/lib/store";

export default async function TapsPage() {
  await requireOwner();
  const site = await getSite();
  return <TapsEditor taps={site.taps} />;
}
