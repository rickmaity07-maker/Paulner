import "server-only";
import { db } from "@/lib/db";

interface Actor {
  id: string;
  email: string;
}

/* Every change made through the portal is recorded here. A failed log write never blocks the change. */
export async function logActivity(
  actor: Actor | null,
  action: string,
  entity = "",
  entityId = "",
  detail = "",
) {
  try {
    await db()`
      insert into activity_log (user_id, user_email, action, entity, entity_id, detail)
      values (${actor?.id ?? null}, ${actor?.email ?? ""}, ${action}, ${entity}, ${entityId}, ${detail.slice(0, 2000)})
    `;
  } catch (error) {
    console.error("Activity log write failed:", error);
  }
}
