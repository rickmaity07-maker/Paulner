import ContentEditor from "@/components/admin/ContentEditor";
import { requireOwner } from "@/lib/auth";
import { getSite } from "@/lib/store";

export default async function ContentPage() {
  await requireOwner();
  const site = await getSite();
  return <ContentEditor hero={site.hero} announcement={site.announcement} info={site.info} marquee={site.marquee} />;
}
