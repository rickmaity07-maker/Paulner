import { appRoute, revokeAppToken } from "@/lib/app-auth";

export const POST = appRoute(async (request) => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (token) await revokeAppToken(token);
});
