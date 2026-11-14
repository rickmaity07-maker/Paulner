import { NextResponse, type NextRequest } from "next/server";
import { RateLimiter, clientIp, ruleFor } from "@/lib/rate-limit";

const limiter = new RateLimiter();

/* Per-IP rate limit on sign-in, booking and export; see lib/rate-limit.ts. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = ruleFor(request.method, pathname, request.headers.has("next-action"));
  if (!rule) return NextResponse.next();

  const wait = limiter.take(`${rule.name}:${clientIp(request.headers)}`, rule);
  if (wait === 0) return NextResponse.next();
  return NextResponse.json(
    { code: "too_many", message: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." },
    { status: 429, headers: { "Retry-After": String(wait), "Cache-Control": "no-store" } },
  );
}

export const config = {
  matcher: ["/login", "/api/app/login", "/api/book", "/api/auth/google/:path*", "/api/profile/export"],
};
