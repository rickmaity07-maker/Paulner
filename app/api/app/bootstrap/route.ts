import { appRoute } from "@/lib/app-auth";
import { appMenu } from "@/lib/deckel";

/* Everything the tablet needs on start: who is signed in, the live menu, the bar's details. */
export const GET = appRoute(async (_request, user) => ({ user, ...(await appMenu()), serverTime: new Date().toISOString() }));
