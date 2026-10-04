import MenuEditor from "@/components/admin/MenuEditor";
import { requireOwner } from "@/lib/auth";
import { getSite } from "@/lib/store";

export default async function MenuPage() {
  await requireOwner();
  const site = await getSite();
  return <MenuEditor menu={site.menu} />;
}
