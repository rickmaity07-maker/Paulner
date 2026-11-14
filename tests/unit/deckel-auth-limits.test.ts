import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/app-auth";
import { hashPassword, safeNext, verifyPassword, verifyPasswordOrDummy } from "@/lib/auth";
import { allocateItems, packItems, toCents, unpackItems, type TabDetail } from "@/lib/deckel";
import { RateLimiter, clientIp, ruleFor } from "@/lib/rate-limit";
import { contentSecurityPolicy } from "@/lib/csp";

describe("content security policy", () => {
  const policy = contentSecurityPolicy("abc123");
  const directive = (name: string) => policy.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

  it("runs only scripts carrying this request's nonce", () => {
    expect(directive("script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(directive("script-src")).not.toContain("unsafe-inline");
    expect(directive("script-src")).not.toContain("unsafe-eval");
  });

  it("blocks plugins, framing, foreign forms and base hijacking", () => {
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self' https://accounts.google.com");
    expect(directive("connect-src")).toBe("connect-src 'self'");
  });

  it("allows eval only while developing", () => {
    expect(contentSecurityPolicy("n", true)).toContain("'unsafe-eval'");
  });
});

describe("money", () => {
  it("turns menu prices into whole cents without float drift", () => {
    expect(toCents("3.50")).toBe(350);
    expect(toCents("2,90")).toBe(290);
    expect(toCents("0.29")).toBe(29);
    expect(toCents(19.99)).toBe(1999);
  });
});

describe("split bill", () => {
  const item = (id: string, unitPriceCents: number, qty: number, extra: Partial<TabDetail["items"][number]> = {}) => ({
    id,
    drinkId: id,
    name: id,
    size: "",
    category: "",
    unitPriceCents,
    qty,
    onHouse: false,
    addedAt: "",
    addedBy: "",
    voided: false,
    voidReason: "",
    paidQty: 0,
    ...extra,
  });
  const tab = {
    items: [item("pils", 350, 3, { paidQty: 1 }), item("wein", 600, 1), item("free", 400, 1, { onHouse: true }), item("gone", 400, 1, { voided: true })],
  } as TabDetail;

  it("prices the chosen drinks on the server", () => {
    expect(allocateItems(tab, [{ itemId: "pils", qty: 2 }, { itemId: "wein" }])).toEqual({
      lines: [{ itemId: "pils", qty: 2 }, { itemId: "wein", qty: 1 }],
      amount: 1300,
    });
  });

  const code = (fn: () => unknown) => {
    try {
      fn();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      return (error as ApiError).code;
    }
    throw new Error("expected an ApiError");
  };

  it("refuses drinks already paid, on the house, voided or unknown", () => {
    expect(code(() => allocateItems(tab, [{ itemId: "pils", qty: 3 }]))).toBe("item_already_paid");
    expect(code(() => allocateItems(tab, [{ itemId: "pils", qty: 1 }, { itemId: "pils", qty: 2 }]))).toBe("item_already_paid");
    expect(code(() => allocateItems(tab, [{ itemId: "free" }]))).toBe("item_not_payable");
    expect(code(() => allocateItems(tab, [{ itemId: "gone" }]))).toBe("item_not_payable");
    expect(code(() => allocateItems(tab, [{ itemId: "nope" }]))).toBe("item_not_payable");
    expect(code(() => allocateItems(tab, []))).toBe("items_invalid");
  });

  it("survives a round trip through Stripe metadata, even when long", () => {
    const lines = Array.from({ length: 60 }, (_, i) => ({ itemId: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`, qty: (i % 9) + 1 }));
    const packed = packItems(lines);
    expect(Object.values(packed).every((v) => v.length <= 500)).toBe(true);
    expect(unpackItems({ tab_id: "x", ...packed })).toEqual(lines);
    expect(unpackItems({ tab_id: "x" })).toBeUndefined();
  });
});

describe("passwords and redirects", () => {
  it("hashes with a fresh salt and verifies", async () => {
    const a = await hashPassword("correct horse");
    const b = await hashPassword("correct horse");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword("correct horse", a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });

  it("never lets an unknown account through, even with the dummy hash", async () => {
    expect(await verifyPasswordOrDummy("anything", undefined)).toBe(false);
    expect(await verifyPasswordOrDummy("anything", "")).toBe(false);
  });

  it("only follows paths on this site after login", () => {
    expect(safeNext("/profile")).toBe("/profile");
    expect(safeNext("//evil.example")).toBe("");
    expect(safeNext("/\\evil.example")).toBe("");
    expect(safeNext("https://evil.example")).toBe("");
    expect(safeNext(undefined)).toBe("");
  });
});

describe("rate limit", () => {
  it("applies only to the guarded endpoints", () => {
    expect(ruleFor("POST", "/login", true)?.name).toBe("login");
    expect(ruleFor("GET", "/login", false)).toBeNull();
    expect(ruleFor("POST", "/login", false)).toBeNull();
    expect(ruleFor("POST", "/api/app/login", false)?.name).toBe("app-login");
    expect(ruleFor("POST", "/api/book", false)?.name).toBe("book");
    expect(ruleFor("GET", "/api/auth/google/callback", false)?.name).toBe("google");
    expect(ruleFor("GET", "/api/app/tabs", false)).toBeNull();
  });

  it("blocks after the limit and frees the address when the window ends", () => {
    const limiter = new RateLimiter();
    const rule = { name: "t", limit: 3, windowMs: 60_000 };
    const t0 = 1_000_000;
    expect([1, 2, 3].map(() => limiter.take("ip", rule, t0))).toEqual([0, 0, 0]);
    expect(limiter.take("ip", rule, t0 + 1000)).toBe(59);
    expect(limiter.take("other", rule, t0 + 1000)).toBe(0);
    expect(limiter.take("ip", rule, t0 + 60_000)).toBe(0);
  });

  it("cannot be grown without bound by many addresses", () => {
    const limiter = new RateLimiter();
    const rule = { name: "t", limit: 1, windowMs: 60_000 };
    for (let i = 0; i < 10_050; i++) limiter.take(`ip${i}`, rule, 0);
    expect(limiter.size).toBeLessThanOrEqual(10_000);
  });

  it("reads the caller's address from the proxy headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
