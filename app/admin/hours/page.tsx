import HoursEditor from "@/components/admin/HoursEditor";
import { requireOwner } from "@/lib/auth";
import { getSite } from "@/lib/store";

export default async function HoursPage() {
  await requireOwner();
  const site = await getSite();
  return <HoursEditor hours={site.hours} closures={site.closures} booking={site.booking} />;
}
