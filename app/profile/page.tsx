import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ProfileView, { type MyReservation } from "./ProfileView";

export const metadata: Metadata = {
  title: "Profil | Paulaner Meets Route 66",
  robots: { index: false },
};

/* Every signed-in account has a profile; owners also get a link to the admin portal. */
export default async function ProfilePage() {
  const me = await requireUser();
  const reservations = (await db()`
    select id, reference, date::text as date, to_char(time, 'HH24:MI') as time, guests, status,
           date >= (now() at time zone 'Europe/Berlin')::date as upcoming
    from reservations
    where user_id = ${me.id}
    order by date desc, time desc
    limit 100
  `) as MyReservation[];

  const [{ has_password: hasPassword }] = (await db()`
    select password_hash <> '' as has_password from users where id = ${me.id}
  `) as { has_password: boolean }[];

  return <ProfileView me={me} reservations={reservations} hasPassword={hasPassword} />;
}
