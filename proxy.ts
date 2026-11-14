import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";
import { clientIp, ruleFor } from "@/lib/rate-limit";
import { take } from "@/lib/rate-limit-store";

/*
  Runs before every page and the guarded API routes:
    1. per-IP rate limit on sign-in, booking and export, shared by all instances (lib/rate-limit-store.ts)
    2. a Content Security Policy with a fresh nonce for every page view, so the
       browser runs only the scripts this server sent (lib/csp.ts)
*/
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = ruleFor(request.method, pathname, request.headers.has("next-action"));
  if (rule) {
    const wait = await take(rule, clientIp(request.headers));
    if (wait > 0) {
      return NextResponse.json(
        { code: "too_many", message: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." },
        { status: 429, headers: { "Retry-After": String(wait), "Cache-Control": "no-store" } },
      );
    }
  }

  // API answers are JSON, not documents; they keep the static headers from next.config.ts.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  // Next reads the policy from the request to put the nonce on its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    // Every page, but not static files.
    "/((?!api/|_next/static|_next/image|icon.svg|robots.txt|sitemap.xml).*)",
    // The API routes that are rate limited.
    "/api/app/login",
    "/api/book",
    "/api/auth/google/:path*",
    "/api/profile/export",
  ],
};
