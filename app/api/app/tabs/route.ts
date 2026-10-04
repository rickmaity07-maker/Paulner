import { ApiError, appRoute, body } from "@/lib/app-auth";
import { listTabs, openTab } from "@/lib/deckel";
import { berlinNow } from "@/lib/hours";

/* GET /api/app/tabs?status=open|on_account|closed&date=YYYY-MM-DD */
export const GET = appRoute(async (request) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "open";
  if (status === "open") return { tabs: await listTabs({ status: "open" }) };
  if (status === "on_account") return { tabs: await listTabs({ status: "on_account" }) };
  if (status === "closed") {
    const date = url.searchParams.get("date") ?? berlinNow().date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(422, "date_invalid");
    return { tabs: await listTabs({ status: "closed_on", date }) };
  }
  throw new ApiError(422, "status_invalid");
});

export const POST = appRoute(async (request, user) => openTab(user, await body(request)));
