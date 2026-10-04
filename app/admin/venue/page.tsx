import VenueEditor from "@/components/admin/VenueEditor";
import { requireOwner } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google";
import { isMailerConfigured } from "@/lib/mailer";
import { getSite } from "@/lib/store";

export default async function VenuePage() {
  await requireOwner();
  const site = await getSite();
  return (
    <VenueEditor
      venue={site.venue}
      setup={{ mail: isMailerConfigured(), google: isGoogleConfigured(), cron: Boolean(process.env.CRON_SECRET) }}
    />
  );
}
