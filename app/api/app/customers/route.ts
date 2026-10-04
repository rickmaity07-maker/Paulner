import { appRoute, body } from "@/lib/app-auth";
import { createCustomer, listCustomers } from "@/lib/deckel";

/* GET /api/app/customers?q=&owing=1&archived=1 */
export const GET = appRoute(async (request) => {
  const url = new URL(request.url);
  return {
    customers: await listCustomers(url.searchParams.get("q") ?? "", {
      owing: url.searchParams.get("owing") === "1",
      archived: url.searchParams.get("archived") === "1",
    }),
  };
});

export const POST = appRoute(async (request, user) => createCustomer(user, await body(request)));
