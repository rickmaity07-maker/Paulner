import BookingsBoard from "@/components/admin/BookingsBoard";
import { requireOwner } from "@/lib/auth";
import { berlinNow } from "@/lib/hours";
import { getBookings } from "@/lib/store";

export default async function BookingsPage() {
  await requireOwner();
  const bookings = await getBookings();
  return <BookingsBoard bookings={bookings} today={berlinNow().date} />;
}
