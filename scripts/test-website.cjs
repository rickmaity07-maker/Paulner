/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script; playwright-core is loaded from a path given at run time */
/*
  Browser test of the website (phone and laptop) against a local server on the TEST database:
    APP_API server: node --env-file=.env.test.local node_modules/next/dist/bin/next dev --port 3100
    PWCORE=<path to playwright-core> node scripts/test-website.cjs
  Signs up a throwaway guest, books, checks the booking limit, walks every admin page.
*/
// Full browser run of the website against the local server on the TEST database.
const pw = require(process.env.PWCORE);
const BASE = "http://localhost:3100";
let passed = 0;
const failed = [];
const errors = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  ✔", name);
  } catch (e) {
    failed.push(name);
    console.log("  ✘", name, "\n     ", e.message.split("\n")[0]);
  }
}
const expect = (c, m) => {
  if (!c) throw new Error(m);
};
const shot = (p, n) => p.screenshot({ path: `${require("os").tmpdir()}/web-${n}.png` });

(async () => {
  const browser = await pw.chromium.launch({ executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe" });
  const watch = (p, who) => {
    p.on("pageerror", (e) => errors.push(`${who}: ${e.message}`));
    p.on("console", (m) => m.type() === "error" && !/hydrat|favicon|Failed to load resource/i.test(m.text()) && errors.push(`${who}: ${m.text().slice(0, 160)}`));
  };

  // ---------- Guest on a phone ----------
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await phone.newPage();
  watch(page, "phone");

  await step("homepage loads in German with the hero", async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    expect((await page.evaluate(() => document.documentElement.lang)) === "de", "lang not de");
    expect(await page.locator("canvas").first().isVisible(), "hero canvas missing");
    await shot(page, "1-hero-phone");
  });
  await step("hero condensation reacts to a finger", async () => {
    const box = await page.locator("canvas").first().boundingBox();
    const sample = () => page.evaluate(() => { const c = document.querySelector("canvas"); const d = c.getContext("2d").getImageData(c.width / 2, c.height * 0.75, 1, 1).data; return d[3]; });
    const before = await sample();
    const cdp = await phone.newCDPSession(page);
    const y = box.y + box.height * 0.75;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 60, y }] });
    for (let x = 60; x <= 330; x += 15) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(100);
    const after = await sample();
    expect(after < before, `fog not wiped (alpha ${before} -> ${after})`);
  });
  await step("language switch to English and back", async () => {
    await page.locator('button[lang="en"]:visible').first().click();
    await page.waitForTimeout(600);
    expect((await page.evaluate(() => document.documentElement.lang)) === "en", "lang not en");
    await page.locator('button[lang="de"]:visible').first().click();
  });
  await step("no sideways scrolling on the phone", async () =>
    expect((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "page wider than screen"));
  await step("drinks: categories switch and prices show", async () => {
    await page.locator("#drinks").scrollIntoViewIfNeeded();
    await page.locator('#drinks [role="tab"]').nth(1).click();
    await page.waitForTimeout(700);
    expect(await page.locator('#drinks [role="tab"]').nth(1).getAttribute("aria-selected") === "true", "tab not selected");
    expect((await page.locator("#drinks-panel").innerText()).includes("€"), "no prices");
  });

  const email = `gast${Date.now()}@example.com`;
  await step("guest signs up", async () => {
    await page.goto(`${BASE}/login?next=%2F%23book&mode=signup`, { waitUntil: "networkidle" });
    await page.fill('input[name="name"]', "Test Gast");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "testtest123");
    await Promise.all([page.waitForURL((u) => u.pathname === "/", { timeout: 30000 }), page.click('button[type="submit"]')]);
  });
  const book = async (offsetDays) => {
    await page.goto(`${BASE}/?b=${offsetDays}#book`, { waitUntil: "networkidle" });
    await page.waitForSelector("#book-date", { timeout: 20000 });
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1); // closed on Sundays
    await page.fill("#book-date", d.toISOString().slice(0, 10));
    await page.locator("#book-time button").nth(2).click();
    await page.click('#book button[type="submit"]');
    await page.waitForTimeout(2500);
    return page.locator("#book").innerText();
  };
  await step("guest books a table on the phone", async () => {
    const text = await book(3);
    expect(/R66-|Anfrage|erhalten/i.test(text), "no confirmation: " + text.slice(0, 120));
    await shot(page, "2-booked-phone");
  });
  await step("a 4th open request is refused (anti-spam limit)", async () => {
    await book(4);
    await book(5);
    const text = await book(6);
    expect(/mehrere offene Anfragen/.test(text), "limit not shown: " + text.slice(0, 160));
  });
  await step("profile lists the bookings", async () => {
    await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    expect((await page.locator("li").filter({ hasText: "R66-" }).count()) >= 3, "bookings missing");
  });
  await step("a guest can't open the admin portal", async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    expect(!page.url().includes("/admin"), "guest reached admin: " + page.url());
  });

  // ---------- Owner on a laptop ----------
  const laptop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const owner = await laptop.newPage();
  watch(owner, "owner");
  await step("owner signs in to the portal", async () => {
    await owner.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await owner.fill('input[name="email"]', "owner.test@paulaner.local");
    await owner.fill('input[name="password"]', "Owner-Test-2026");
    await Promise.all([owner.waitForURL(/\/admin/, { timeout: 30000 }), owner.click('button[type="submit"]')]);
    await owner.waitForSelector("text=Bar heute");
  });
  await step("owner confirms a pending booking", async () => {
    await owner.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await owner.getByRole("button", { name: /Bestätigen/ }).first().click();
    await owner.waitForSelector("text=bestätigt", { timeout: 20000 });
  });
  for (const p of ["kasse", "gaeste", "bookings", "menu", "taps", "hours", "content", "venue", "users", "app", "activity"]) {
    await step(`admin page /admin/${p} renders`, async () => {
      await owner.goto(`${BASE}/admin/${p}`, { waitUntil: "networkidle" });
      expect((await owner.locator("h1").first().innerText()).length > 2, "no heading");
      await shot(owner, `3-admin-${p}`);
    });
  }
  await step("menu edit (sold out) shows on the website, then is undone", async () => {
    await owner.goto(`${BASE}/admin/menu`, { waitUntil: "networkidle" });
    const toggle = owner.getByRole("switch", { name: /Paulaner Pils ausverkauft/ });
    await toggle.click();
    await owner.getByRole("button", { name: /Speichern/ }).click();
    await owner.waitForSelector("text=Karte gespeichert", { timeout: 20000 });
    await page.goto(BASE, { waitUntil: "networkidle" });
    const soldOut = await page.locator("#drinks").getByText(/Ausverkauft/i).count();
    await toggle.click();
    await owner.getByRole("button", { name: /Speichern/ }).click();
    await owner.waitForSelector("text=Karte gespeichert", { timeout: 20000 });
    expect(soldOut > 0, "sold-out badge not on the website");
  });
  await step("admin portal works on a phone too", async () => {
    const adminPhone = await phone.browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await adminPhone.newPage();
    await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await p.fill('input[name="email"]', "owner.test@paulaner.local");
    await p.fill('input[name="password"]', "Owner-Test-2026");
    await Promise.all([p.waitForURL(/\/admin/, { timeout: 30000 }), p.click('button[type="submit"]')]);
    for (const path of ["/admin", "/admin/kasse", "/admin/gaeste", "/admin/bookings"]) {
      await p.goto(BASE + path, { waitUntil: "networkidle" });
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(over <= 0, `${path} is ${over}px too wide on a phone`);
    }
    await shot(p, "4-admin-kasse-phone");
    await adminPhone.close();
  });

  console.log(errors.length ? `\nBrowser errors:\n  ${errors.join("\n  ")}` : "\nNo browser errors.");
  console.log(`\n${passed} passed, ${failed.length} failed`);
  await browser.close();
  process.exit(failed.length || errors.length ? 1 : 0);
})().catch((e) => {
  console.error("CRASHED:", e.message);
  process.exit(1);
});
