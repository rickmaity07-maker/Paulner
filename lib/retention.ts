import "server-only";
import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";

/*
  Storage limitation (Art. 5(1)(e) DSGVO). The periods are stated in the
  privacy policy; change both together.
*/
export const RETENTION = {
  reservationMonths: 6,
  activityMonths: 12,
  loginAttemptHours: 24,
} as const;

export async function purgeExpiredData() {
  const sql = db();
  const [reservations, activity, attempts, sessions] = (await sql.transaction([
    sql`delete from reservations
        where date < (now() at time zone 'Europe/Berlin')::date - make_interval(months => ${RETENTION.reservationMonths})
        returning id`,
    sql`delete from activity_log where at < now() - make_interval(months => ${RETENTION.activityMonths}) returning id`,
    sql`delete from login_attempts where attempted_at < now() - make_interval(hours => ${RETENTION.loginAttemptHours}) returning id`,
    sql`delete from sessions where expires_at < now() returning token_hash`,
  ])) as unknown[][];

  const counts = {
    reservations: reservations.length,
    activity: activity.length,
    loginAttempts: attempts.length,
    sessions: sessions.length,
  };
  if (counts.reservations || counts.activity) {
    await logActivity(null, "Löschfristen angewendet", "", "", `${counts.reservations} Reservierungen, ${counts.activity} Protokolleinträge`);
  }
  return counts;
}
