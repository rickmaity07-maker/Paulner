/*
  Read-only checks against the live site. Changes nothing and signs in to nothing.

    node scripts/smoke-production.mjs [https://paulaner-teal.vercel.app]

  Pages answer, private areas send strangers to the login, the app API wants a
  token, security headers are set, and no secret appears in the JavaScript
  every visitor downloads.
*/
const BASE = process.argv[2] ?? "https://paulaner-teal.vercel.app";
let passed = 0;
const failures = [];
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  ✘ ${name}\n      ${error.message}`);
  }
}
const get = (path, init) => fetch(BASE + path, { redirect: "manual", ...init });
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

console.log(`Production smoke test: ${BASE}\n`);

for (const path of ["/", "/login", "/impressum", "/datenschutz", "/robots.txt", "/sitemap.xml"]) {
  await check(`${path} answers 200`, async () => expect((await get(path)).status === 200, `status ${(await get(path)).status}`));
}
await check("unknown pages answer 404", async () => expect((await get("/gibt-es-nicht")).status === 404, "not 404"));

for (const path of ["/admin", "/admin/kasse", "/admin/gaeste", "/admin/users", "/admin/app", "/profile"]) {
  await check(`${path} sends strangers to the login`, async () => {
    const r = await get(path);
    expect([303, 307, 308].includes(r.status) && (r.headers.get("location") ?? "").includes("/login"), `status ${r.status} -> ${r.headers.get("location")}`);
  });
}
await check("admin CSV export needs an owner", async () => expect((await get("/admin/export?type=bookings")).status === 401, "not 401"));

for (const [method, path] of [["GET", "/api/app/tabs"], ["GET", "/api/app/stats"], ["GET", "/api/app/customers"], ["POST", "/api/app/tabs"], ["POST", "/api/app/stripe/payment-intent"]]) {
  await check(`${method} ${path} wants a token`, async () => expect((await get(path, { method })).status === 401, "not 401"));
}
await check("forged app tokens are refused", async () =>
  expect((await get("/api/app/tabs", { headers: { Authorization: "Bearer r66app_forged" } })).status === 401, "not 401"));
await check("booking needs an account", async () =>
  expect((await get("/api/book", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } })).status === 401, "not 401"));
await check("cron cleanup needs its secret", async () => expect((await get("/api/cron/cleanup")).status === 401, "not 401"));
await check("version endpoint is public and well-formed", async () => {
  const r = await (await get("/api/app/version?current=0")).json();
  expect(r.latest?.versionCode > 0 && /^[0-9a-f]{64}$/.test(r.latest.sha256) && r.latest.url.startsWith("https://"), JSON.stringify(r).slice(0, 120));
});

await check("security headers are set", async () => {
  const h = (await get("/")).headers;
  const want = {
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
  for (const [k, v] of Object.entries(want)) expect(h.get(k) === v, `${k}: ${h.get(k)}`);
  expect((h.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"), "CSP frame-ancestors");
  expect((h.get("strict-transport-security") ?? "").includes("max-age="), "HSTS");
});
await check("admin is not indexed by search engines", async () => {
  const robots = await (await get("/robots.txt")).text();
  expect(/Disallow:\s*\/admin/i.test(robots), "robots.txt doesn't exclude /admin");
});
await check("plain http is redirected to https", async () => {
  const r = await fetch(BASE.replace("https://", "http://") + "/", { redirect: "manual" });
  expect([301, 307, 308].includes(r.status), `status ${r.status}`);
});

await check("no secrets in the JavaScript sent to visitors", async () => {
  const html = await (await get("/")).text();
  const scripts = [...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]))];
  expect(scripts.length > 0, "no scripts found");
  const patterns = [/sk_(live|test)_[A-Za-z0-9]{10,}/, /postgres(ql)?:\/\/[^"'\s]+/, /vercel_blob_rw_[A-Za-z0-9]+/, /GOCSPX-[A-Za-z0-9_-]+/, /DATABASE_URL/, /SMTP_PASS|GMAIL_APP_PASSWORD/, /r66app_[A-Za-z0-9_-]{20,}/];
  for (const src of scripts) {
    const js = await (await get(src)).text();
    for (const p of patterns) expect(!p.test(js), `${src} matches ${p}`);
  }
  console.log(`      (${scripts.length} script files scanned)`);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
