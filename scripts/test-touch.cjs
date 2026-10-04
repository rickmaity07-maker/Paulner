/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script; playwright-core is loaded from a path given at run time */
/*
  Finger test of the fogged glass (hero and footer) on an emulated phone, read-only against any server:
    PWCORE=<path to playwright-core> [BASE=http://localhost:3100] [BROWSER=<path to a Chromium>] node scripts/test-touch.cjs
  Real touches go through Chromium's input pipeline, so the page scrolls exactly as it would under a finger.
  Each touch must either draw or scroll, never both: hold or start sideways to draw, swipe up or down to scroll.
  Whether a stroke wiped the fog is read straight off the canvas pixels.
*/
const pw = require(process.env.PWCORE);
const BASE = process.env.BASE || "http://localhost:3100";
let passed = 0;
const failed = [];
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Points along a straight stroke.
const line = (x0, y0, x1, y1, n = 12) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
const HERO = "#top canvas";
const FOOT = "footer canvas";
// A wipe takes the fog's alpha down by far more than this; drips and drifting mist stay well under it.
const WIPED = 25;

(async () => {
  const browser = await pw.chromium.launch(process.env.BROWSER ? { executablePath: process.env.BROWSER } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);

  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
  // hold: how long the finger rests before it starts moving.
  async function gesture(path, { hold = 0 } = {}) {
    await touch("touchStart", ...path[0]);
    if (hold) await sleep(hold);
    for (const p of path.slice(1)) {
      await touch("touchMove", ...p);
      await sleep(16);
    }
    await touch("touchEnd");
    await sleep(350);
  }
  // Mean fog alpha around (x, y) in the canvas's own coordinates, so scrolling never moves the sample.
  const fogAt = (sel, x, y) =>
    page.evaluate(
      ({ sel, x, y }) => {
        const c = document.querySelector(sel);
        const s = c.width / c.clientWidth;
        const d = c.getContext("2d").getImageData(Math.round(x * s) - 6, Math.round(y * s) - 6, 12, 12).data;
        let a = 0;
        for (let i = 3; i < d.length; i += 4) a += d[i];
        return Math.round(a / (d.length / 4));
      },
      { sel, x, y },
    );
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
  // Fresh page, with time for the glass to steam up and the word to be written.
  async function fresh() {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await sleep(4500);
  }

  console.log(`Fog glass under a finger, ${BASE}\n`);

  await step("hero: a quick swipe up scrolls the page and wipes nothing", async () => {
    await fresh();
    const before = await fogAt(HERO, 195, 560);
    await gesture(line(195, 640, 195, 340));
    const y = await scrollY();
    const after = await fogAt(HERO, 195, 560);
    expect(y > 50, `page did not scroll (scrollY ${y})`);
    expect(after > before - WIPED, `fog was wiped (${before} -> ${after})`);
  });

  await step("hero: hold, then draw up and down keeps the page still and wipes", async () => {
    await fresh();
    const before = await fogAt(HERO, 195, 560);
    await gesture([...line(195, 640, 195, 500), ...line(195, 500, 195, 640)], { hold: 400 });
    const y = await scrollY();
    const after = await fogAt(HERO, 195, 560);
    expect(y === 0, `page scrolled to ${y}`);
    expect(after < before - WIPED, `fog not wiped (${before} -> ${after})`);
  });

  await step("hero: a second hold-and-draw keeps the page still too", async () => {
    await gesture([...line(120, 640, 120, 420), ...line(120, 420, 260, 600)], { hold: 400 });
    const y = await scrollY();
    expect(y === 0, `page scrolled to ${y}`);
  });

  await step("hero: a swipe right after drawing scrolls (no lingering drawing mode)", async () => {
    await gesture(line(300, 640, 300, 340));
    const y = await scrollY();
    expect(y > 50, `page did not scroll (scrollY ${y})`);
  });

  await step("hero: a finger resting briefly before a swipe still scrolls", async () => {
    await fresh();
    await gesture(line(195, 640, 195, 340), { hold: 120 });
    const y = await scrollY();
    expect(y > 50, `page did not scroll (scrollY ${y})`);
  });

  await step("hero: a stroke that starts sideways draws, even when it turns vertical", async () => {
    await fresh();
    const before = await fogAt(HERO, 140, 520);
    await gesture([...line(100, 600, 140, 600, 4), ...line(140, 600, 140, 400)]);
    const y = await scrollY();
    const after = await fogAt(HERO, 140, 520);
    expect(y === 0, `page scrolled to ${y}`);
    expect(after < before - WIPED, `fog not wiped (${before} -> ${after})`);
  });

  await step("hero: tapping Tisch reservieren still jumps to the booking form", async () => {
    await fresh();
    const at = await page.evaluate(() => {
      const r = document.querySelector('#top a[href="#book"]').getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    await touch("touchStart", ...at);
    await sleep(60);
    await touch("touchEnd");
    await sleep(1500);
    const y = await scrollY();
    expect(y > 2000, `did not reach the booking form (scrollY ${y})`);
  });

  await step("footer: hold-and-draw keeps the page still and wipes; a quick swipe scrolls", async () => {
    await fresh();
    await page.evaluate(() => document.querySelector("footer canvas").scrollIntoView({ block: "center" }));
    await sleep(4500);
    const start = await scrollY();
    const box = await page.evaluate(() => {
      const r = document.querySelector("footer canvas").getBoundingClientRect();
      return { top: Math.max(0, r.top), bottom: Math.min(innerHeight, r.bottom), canvasTop: r.top };
    });
    const mid = Math.round((box.top + box.bottom) / 2);
    const local = mid - box.canvasTop;
    const before = await fogAt(FOOT, 195, local);
    await gesture([...line(195, mid + 80, 195, mid - 80), ...line(195, mid - 80, 195, mid + 80)], { hold: 400 });
    const after = await fogAt(FOOT, 195, local);
    let y = await scrollY();
    expect(Math.abs(y - start) < 2, `drawing scrolled the page (${start} -> ${y})`);
    expect(after < before - WIPED, `fog not wiped (${before} -> ${after})`);
    await gesture(line(195, box.top + 40, 195, box.bottom - 20));
    y = await scrollY();
    expect(Math.abs(start - y) > 50, `swipe did not scroll (${start} -> ${y})`);
  });

  console.log(errors.length ? `\nBrowser errors:\n  ${errors.join("\n  ")}` : "\nNo browser errors.");
  console.log(`\n${passed} passed, ${failed.length} failed`);
  await browser.close();
  process.exit(failed.length || errors.length ? 1 : 0);
})().catch((e) => {
  console.error("CRASHED:", e.message);
  process.exit(1);
});
