# Paulaner Meets Route 66 – Security, Quality & Performance Audit

**Date:** 2026-11-14/15 · **Branch:** `main` (pushed through 09052d1) · **Stack:** Next.js 16.4.6, React 19, Neon Postgres, Vercel, Deckel tablet app · **Live:** paulaner-teal.vercel.app

## Summary

| Area | Before | After |
|---|---|---|
| Production dependency vulnerabilities | critical Next.js advisory + high in zod/undici | **0** |
| Tab/payment authorization bugs | 4 | **0**, covered by tests |
| Automated tests | browser scripts only | **105** Vitest tests (unit + PGlite database), plus the browser scripts in CI |
| CSP | none | nonce with `strict-dynamic` |
| Rate limits | none | shared in Postgres (HMAC of the IP, deleted after 24 h) |
| CI | none | `check` job + `e2e` job against the Neon test branch |
| Phone JavaScript download | 631 KB | 442 KB |

## Fixed

- **Tabs and payments** (`lib/deckel.ts`):
  - only the owner can move a closed tab to another guest
  - lowering a quantity follows the void rule
  - 0 € rounds create no payment
  - a Stripe intent can't be recorded twice
  - `settleCustomer` locks the guest's tabs and refuses overpayment
- **Booking:** uses Berlin time, refuses slots that have already started, and the form hides them. "Open now" is correct after midnight.
- **Security headers and limits:**
  - CSP (`lib/csp.ts`, `proxy.ts`)
  - rate limits on login, tablet login, booking, Google sign-in and export, answering with 429 and Retry-After
- **New pages:** 404 page, error page, `/api/health`.
- **2026-11-15 (pushed, 1bcb199):** the 404 page renders per request (`await connection()`). The prebuilt version had no CSP nonce, so the browser blocked its scripts.
- **Speed:** GSAP and Lenis load only on desktop, the fog glass sets up lazily, and the homepage sections hydrate one at a time.

## Results

- 105/105 tests pass, typecheck and lint are clean, the build passes.
- CI `check` + `e2e` green; Vercel deploy green; production smoke test 27/27.

## Action needed

1. ~~Create the `rate_limits` table on the live database~~ done 2026-11-15 (`npm run db:setup`, only `create … if not exists`); health check still `ok`.
2. Release the tablet app from the machine that has the Android SDK and the `~/.android-paulaner` signing key (neither is on this PC). Never create a new key: the installed tablets would refuse the update.

## Known remaining

- The mobile Lighthouse score is about 48–58 and varies between runs. The rest of the cost is layout and hydration of the animated sections; going faster means changing how the animations look.
