/*
  End-to-end tests for the Deckel tablet API.

    APP_API=http://localhost:3100 node scripts/test-app-api.mjs

  Needs two accounts on the target database (never run it against production):
    owner.test@paulaner.local / Owner-Test-2026   (role owner)
    staff.test@paulaner.local / Staff-Test-2026   (role staff)
*/
const API = process.env.APP_API ?? "http://localhost:3100";
let passed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  ✘ ${name}\n      ${error.message}`);
  }
}
function eq(actual, expected, what) {
  if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}
const ok = async (promise, what) => {
  const r = await promise;
  if (r.status >= 300) throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.json)}`);
  return r.json;
};
const login = async (email, password) => (await ok(call("POST", "/api/app/login", { body: { email, password } }), "login")).token;

console.log(`Deckel API tests against ${API}\n`);

let owner, staff, menu, pils, helles, spezi;

console.log("Auth");
await test("rejects requests without a token", async () => eq((await call("GET", "/api/app/tabs")).status, 401, "status"));
await test("rejects a forged token", async () => eq((await call("GET", "/api/app/tabs", { token: "r66app_nope" })).status, 401, "status"));
await test("rejects a wrong password", async () => {
  const r = await call("POST", "/api/app/login", { body: { email: "staff.test@paulaner.local", password: "wrong" } });
  eq(r.status, 401, "status");
  eq(r.json.code, "credentials", "code");
});
await test("owner and staff can sign in", async () => {
  owner = await login("owner.test@paulaner.local", "Owner-Test-2026");
  staff = await login("staff.test@paulaner.local", "Staff-Test-2026");
  if (!owner?.startsWith("r66app_") || !staff?.startsWith("r66app_")) throw new Error("no token");
});

console.log("\nMenu");
await test("bootstrap returns the user and the website's live menu", async () => {
  const b = await ok(call("GET", "/api/app/bootstrap", { token: staff }), "bootstrap");
  eq(b.user.role, "staff", "role");
  eq(b.categories.length, 4, "categories");
  menu = b.categories.flatMap((c) => c.drinks);
  pils = menu.find((d) => d.name === "Paulaner Pils");
  helles = menu.find((d) => d.name === "Paulaner Helles");
  spezi = menu.find((d) => d.name === "Spezi");
  eq(pils.priceCents, 350, "Pils price");
  eq(helles.priceCents, 400, "Helles price");
});

console.log("\nGuests");
let guest, guestTwo;
await test("staff creates a regular guest", async () => {
  guest = await ok(
    call("POST", "/api/app/customers", { token: staff, body: { name: "Klaus Stammgast", phone: "+49 9721 55555", regular: true, note: "Trinkt Helles" } }),
    "create",
  );
  eq(guest.regular, true, "regular");
  eq(guest.balanceCents, 0, "balance");
});
await test("guest name is required", async () => eq((await call("POST", "/api/app/customers", { token: staff, body: { name: " " } })).json.code, "name_required", "code"));
await test("invalid email is refused", async () =>
  eq((await call("POST", "/api/app/customers", { token: staff, body: { name: "X", email: "nope" } })).json.code, "email_invalid", "code"));
await test("staff cannot set a credit limit, owner can", async () => {
  eq((await call("PATCH", `/api/app/customers/${guest.id}`, { token: staff, body: { creditLimitCents: 5000 } })).status, 403, "staff status");
  const g = await ok(call("PATCH", `/api/app/customers/${guest.id}`, { token: owner, body: { creditLimitCents: 5000 } }), "owner patch");
  eq(g.creditLimitCents, 5000, "limit");
});
await test("search finds the guest by name and phone", async () => {
  const byName = await ok(call("GET", "/api/app/customers?q=stammgast", { token: staff }), "search");
  const byPhone = await ok(call("GET", "/api/app/customers?q=55555", { token: staff }), "search");
  if (!byName.customers.some((c) => c.id === guest.id) || !byPhone.customers.some((c) => c.id === guest.id)) throw new Error("not found");
});

console.log("\nPay-later tab");
let tab;
await test("opens a tab for the guest", async () => {
  tab = await ok(call("POST", "/api/app/tabs", { token: staff, body: { customerId: guest.id, table: "4", mode: "pay_later" } }), "open");
  eq(tab.label, "Klaus Stammgast", "label from guest");
  eq(tab.status, "open", "status");
  eq(tab.balanceCents, 0, "balance");
});
await test("a guest can't have two open tabs", async () => {
  const r = await call("POST", "/api/app/tabs", { token: staff, body: { customerId: guest.id } });
  eq(r.status, 409, "status");
  eq(r.json.code, "customer_has_open_tab", "code");
});
await test("adds a round at server prices (3× Pils, 2× Helles = 18.50 €)", async () => {
  tab = await ok(
    call("POST", `/api/app/tabs/${tab.id}/items`, { token: staff, body: { items: [{ drinkId: pils.id, qty: 3 }, { drinkId: helles.id, qty: 2 }] } }),
    "items",
  );
  eq(tab.totalCents, 1850, "total");
  eq(tab.balanceCents, 1850, "balance");
  eq(tab.itemCount, 5, "count");
});
await test("ignores prices sent by the tablet", async () => {
  tab = await ok(call("POST", `/api/app/tabs/${tab.id}/items`, { token: staff, body: { items: [{ drinkId: spezi.id, qty: 1, priceCents: 1 }] } }), "items");
  eq(tab.totalCents, 2200, "total uses 3.50 for Spezi");
});
await test("unknown drinks and silly quantities are refused", async () => {
  eq((await call("POST", `/api/app/tabs/${tab.id}/items`, { token: staff, body: { items: [{ drinkId: "nope" }] } })).json.code, "drink_not_found", "unknown");
  eq((await call("POST", `/api/app/tabs/${tab.id}/items`, { token: staff, body: { items: [{ drinkId: pils.id, qty: 500 }] } })).json.code, "qty_invalid", "qty");
});
await test("staff voids their own fresh entry", async () => {
  const spItem = tab.items.find((i) => i.name === "Spezi");
  tab = await ok(call("PATCH", `/api/app/tabs/${tab.id}/items/${spItem.id}`, { token: staff, body: { action: "void", reason: "Falsch getippt" } }), "void");
  eq(tab.totalCents, 1850, "total after void");
  eq(tab.items.find((i) => i.id === spItem.id).voided, true, "voided flag");
});
await test("only owners put a drink on the house", async () => {
  const helItem = tab.items.find((i) => i.name === "Paulaner Helles");
  eq((await call("PATCH", `/api/app/tabs/${tab.id}/items/${helItem.id}`, { token: staff, body: { action: "on_house" } })).status, 403, "staff");
  tab = await ok(call("PATCH", `/api/app/tabs/${tab.id}/items/${helItem.id}`, { token: owner, body: { action: "on_house" } }), "owner");
  eq(tab.totalCents, 1050, "total without the 2 Helles");
  tab = await ok(call("PATCH", `/api/app/tabs/${tab.id}/items/${helItem.id}`, { token: owner, body: { action: "charge" } }), "charge again");
  eq(tab.totalCents, 1850, "charged again");
});
await test("partial cash payment with tip", async () => {
  tab = await ok(call("POST", `/api/app/tabs/${tab.id}/payments`, { token: staff, body: { amountCents: 1000, tipCents: 150, method: "cash" } }), "pay");
  eq(tab.paidCents, 1000, "paid");
  eq(tab.balanceCents, 850, "balance");
});
await test("overpaying and Tap to Pay without Stripe are refused", async () => {
  eq((await call("POST", `/api/app/tabs/${tab.id}/payments`, { token: staff, body: { amountCents: 99999, method: "cash" } })).json.code, "amount_exceeds_balance", "over");
  eq((await call("POST", `/api/app/tabs/${tab.id}/payments`, { token: staff, body: { amountCents: 100, method: "tap_to_pay" } })).json.code, "use_stripe_endpoint", "ttp");
});
await test("can't close while money is owed", async () =>
  eq((await call("POST", `/api/app/tabs/${tab.id}/close`, { token: staff, body: { action: "close" } })).json.code, "balance_not_zero", "code"));
await test("puts the rest on the guest's account (anschreiben)", async () => {
  tab = await ok(call("POST", `/api/app/tabs/${tab.id}/close`, { token: staff, body: { action: "on_account" } }), "on account");
  eq(tab.status, "on_account", "status");
  const g = await ok(call("GET", `/api/app/customers/${guest.id}`, { token: staff }), "guest");
  eq(g.balanceCents, 850, "guest owes");
  eq(g.openTabId, null, "no open tab");
  const owing = await ok(call("GET", "/api/app/customers?owing=1", { token: staff }), "owing");
  if (!owing.customers.some((c) => c.id === guest.id)) throw new Error("not in owing list");
});
await test("guest settles the debt by card terminal; the tab closes itself", async () => {
  const g = await ok(call("POST", `/api/app/customers/${guest.id}/settle`, { token: staff, body: { amountCents: 850, method: "card_terminal" } }), "settle");
  eq(g.balanceCents, 0, "owes nothing");
  const t = await ok(call("GET", `/api/app/tabs/${tab.id}`, { token: staff }), "tab");
  eq(t.status, "closed", "tab closed");
  eq(g.favourites[0].name, "Paulaner Pils", "favourite drink");
});

console.log("\nPay-as-you-go tab");
let walkIn;
await test("walk-in tab without a guest record", async () => {
  walkIn = await ok(call("POST", "/api/app/tabs", { token: staff, body: { label: "Junggesellenabschied", table: "Terrasse", mode: "pay_as_you_go" } }), "open");
  eq(walkIn.customer, null, "no guest");
});
await test("a round paid on the spot keeps the balance at zero", async () => {
  walkIn = await ok(
    call("POST", `/api/app/tabs/${walkIn.id}/items`, { token: staff, body: { items: [{ drinkId: pils.id, qty: 6 }], payNow: { method: "cash", tipCents: 100 } } }),
    "round",
  );
  eq(walkIn.totalCents, 2100, "total");
  eq(walkIn.balanceCents, 0, "balance");
});
await test("walk-ins can't be put on account", async () =>
  eq((await call("POST", `/api/app/tabs/${walkIn.id}/close`, { token: staff, body: { action: "on_account" } })).json.code, "on_account_needs_customer", "code"));
await test("closes the settled tab", async () => {
  walkIn = await ok(call("POST", `/api/app/tabs/${walkIn.id}/close`, { token: staff, body: { action: "close" } }), "close");
  eq(walkIn.status, "closed", "status");
});
await test("closed tabs refuse new drinks; only owners reopen", async () => {
  eq((await call("POST", `/api/app/tabs/${walkIn.id}/items`, { token: staff, body: { items: [{ drinkId: pils.id }] } })).json.code, "tab_not_open", "add");
  eq((await call("POST", `/api/app/tabs/${walkIn.id}/close`, { token: staff, body: { action: "reopen" } })).status, 403, "staff reopen");
  const t = await ok(call("POST", `/api/app/tabs/${walkIn.id}/close`, { token: owner, body: { action: "reopen" } }), "owner reopen");
  eq(t.status, "open", "reopened");
  await ok(call("POST", `/api/app/tabs/${walkIn.id}/close`, { token: owner, body: { action: "close" } }), "close again");
});

console.log("\nOwner controls");
await test("owner refunds a mistaken payment", async () => {
  guestTwo = await ok(call("POST", "/api/app/customers", { token: staff, body: { name: "Erika Test" } }), "guest");
  let t = await ok(call("POST", "/api/app/tabs", { token: staff, body: { customerId: guestTwo.id } }), "tab");
  t = await ok(call("POST", `/api/app/tabs/${t.id}/items`, { token: staff, body: { items: [{ drinkId: helles.id, qty: 1 }] } }), "items");
  t = await ok(call("POST", `/api/app/tabs/${t.id}/payments`, { token: staff, body: { amountCents: 400, method: "cash" } }), "pay");
  eq((await call("POST", `/api/app/payments/${t.payments[0].id}/refund`, { token: staff })).status, 403, "staff refund");
  t = await ok(call("POST", `/api/app/payments/${t.payments[0].id}/refund`, { token: owner }), "owner refund");
  eq(t.balanceCents, 400, "owed again");
  eq(t.payments[0].refunded, true, "refunded flag");
  // An owner voids the whole tab once nothing is paid.
  t = await ok(call("POST", `/api/app/tabs/${t.id}/close`, { token: owner, body: { action: "void" } }), "void tab");
  eq(t.status, "void", "void");
  eq(t.totalCents, 0, "nothing counts");
});
await test("guests who owe money can't be archived", async () => {
  let t = await ok(call("POST", "/api/app/tabs", { token: staff, body: { customerId: guestTwo.id } }), "tab");
  t = await ok(call("POST", `/api/app/tabs/${t.id}/items`, { token: staff, body: { items: [{ drinkId: pils.id, qty: 1 }] } }), "items");
  await ok(call("POST", `/api/app/tabs/${t.id}/close`, { token: staff, body: { action: "on_account" } }), "on account");
  eq((await call("PATCH", `/api/app/customers/${guestTwo.id}`, { token: staff, body: { archived: true } })).json.code, "customer_owes_money", "code");
});

console.log("\nFigures & lists");
await test("today's figures add up", async () => {
  const s = await ok(call("GET", "/api/app/stats", { token: staff }), "stats");
  eq(s.revenueCents, 1000 + 850 + 2100, "revenue (refund excluded)");
  eq(s.tipsCents, 150 + 100, "tips");
  eq(s.debts.balanceCents, 350, "Erika owes one Pils");
  eq(s.topDrinks[0].name, "Paulaner Pils", "top drink");
  const cash = s.byMethod.find((m) => m.method === "cash");
  eq(cash.amount, 1000 + 2100, "cash");
  if (s.voids.count < 1) throw new Error("voids not counted");
});
await test("lists: open, on account, closed today", async () => {
  const open = await ok(call("GET", "/api/app/tabs?status=open", { token: staff }), "open");
  const acct = await ok(call("GET", "/api/app/tabs?status=on_account", { token: staff }), "acct");
  const closed = await ok(call("GET", "/api/app/tabs?status=closed", { token: staff }), "closed");
  eq(open.tabs.some((t) => t.id === tab.id), false, "settled tab not open");
  if (!acct.tabs.some((t) => t.customer?.id === guestTwo.id)) throw new Error("Erika not on account");
  if (!closed.tabs.some((t) => t.id === walkIn.id)) throw new Error("walk-in not in closed list");
});
await test("Stripe endpoints answer clearly when Stripe isn't configured", async () => {
  const r = await call("POST", "/api/app/stripe/connection-token", { token: staff });
  if (![200, 503].includes(r.status)) throw new Error("status " + r.status);
});
await test("sign-out revokes the token", async () => {
  await ok(call("POST", "/api/app/logout", { token: staff }), "logout");
  eq((await call("GET", "/api/app/tabs", { token: staff })).status, 401, "after logout");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
