import { ApiError, appRoute } from "@/lib/app-auth";
import { stats } from "@/lib/deckel";
import { berlinNow } from "@/lib/hours";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/* GET /api/app/stats?from=YYYY-MM-DD&to=YYYY-MM-DD (Schweinfurt calendar days, inclusive; default today) */
export const GET = appRoute(async (request) => {
  const url = new URL(request.url);
  const today = berlinNow().date;
  const from = url.searchParams.get("from") ?? today;
  const to = url.searchParams.get("to") ?? from;
  if (!DATE.test(from) || !DATE.test(to) || from > to) throw new ApiError(422, "range_invalid");
  return stats(from, to);
});
