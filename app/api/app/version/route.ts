import { updateInfo } from "@/lib/app-releases";

/*
  GET /api/app/version?current=<versionCode>
  Asked by the tablet on start and every half hour, before and after sign-in,
  so it needs no token. Answers with the newer version to install (if any).
*/
export async function GET(request: Request) {
  const current = Number(new URL(request.url).searchParams.get("current") ?? 0);
  if (!Number.isInteger(current) || current < 0) return Response.json({ code: "current_invalid" }, { status: 422 });
  return Response.json(await updateInfo(current), { headers: { "Cache-Control": "no-store" } });
}
