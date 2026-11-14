import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, type AppUser } from "@/lib/app-auth";
import {
  addItems,
  addPayment,
  changeItem,
  closeTab,
  createCustomer,
  getCustomer,
  getTab,
  openTab,
  refundPayment,
  settleCustomer,
  stats,
  toCents,
  updateCustomer,
  updateTab,
} from "@/lib/deckel";
import { getSite } from "@/lib/store";
import { addUser, testDb } from "../support/pglite-db";

/* Tabs and money against real SQL: the rules the tablet relies on. */
let owner: AppUser;
let staff: AppUser;
let otherStaff: AppUser;
let drink: { id: string; cents: number };

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error.code;
    throw error;
  }
  throw new Error("expected an ApiError");
};

beforeEach(async () => {
  owner = (await addUser("owner@test.local", "owner")) as AppUser;
  staff = (await addUser("staff@test.local", "staff")) as AppUser;
  otherStaff = (await addUser("staff2@test.local", "staff")) as AppUser;
  const site = await getSite();
  const first = site.menu[0].drinks[0];
  drink = { id: first.id, cents: toCents(first.price) };
});

describe("opening tabs and adding drinks", () => {
  it("prices drinks from the server menu, never from the request", async () => {
    const tab = await openTab(staff, { table: "7" });
    expect(tab.label).toBe("Tisch 7");
    const after = await addItems(staff, tab.id, { items: [{ drinkId: drink.id, qty: 2, priceCents: 1 }] });
    expect(after.totalCents).toBe(drink.cents * 2);
    expect(after.balanceCents).toBe(drink.cents * 2);
  });

  it("refuses unknown drinks and silly quantities", async () => {
    const tab = await openTab(staff, { label: "Bar" });
    expect(await code(addItems(staff, tab.id, { items: [{ drinkId: "nope" }] }))).toBe("drink_not_found");
    expect(await code(addItems(staff, tab.id, { items: [{ drinkId: drink.id, qty: 100 }] }))).toBe("qty_invalid");
    expect(await code(addItems(staff, tab.id, { items: [] }))).toBe("items_invalid");
  });

  it("pays a pay-as-you-go round in the same step", async () => {
    const tab = await openTab(staff, { label: "Theke", mode: "pay_as_you_go" });
    const after = await addItems(staff, tab.id, { items: [{ drinkId: drink.id }], payNow: { method: "cash" } });
    expect(after.balanceCents).toBe(0);
    expect(after.payments).toHaveLength(1);
  });

  it("keeps one open tab per guest", async () => {
    const guest = await createCustomer(staff, { name: "Stammgast" });
    await openTab(staff, { customerId: guest.id });
    expect(await code(openTab(staff, { customerId: guest.id }))).toBe("customer_has_open_tab");
  });
});

describe("payments", () => {
  it("cannot take more than the tab owes", async () => {
    const tab = await openTab(staff, { label: "A" });
    await addItems(staff, tab.id, { items: [{ drinkId: drink.id }] });
    expect(await code(addPayment(staff, tab.id, { method: "cash", amountCents: drink.cents + 1 }))).toBe("amount_exceeds_balance");
    expect(await code(addPayment(staff, tab.id, { method: "bitcoin", amountCents: 1 }))).toBe("method_invalid");
    expect(await code(addPayment(staff, tab.id, { method: "tap_to_pay", amountCents: 1 }))).toBe("tap_to_pay_needs_stripe");
  });

  it("splits the bill by drink, and a drink can only be paid once", async () => {
    const tab = await openTab(staff, { label: "Tisch 3" });
    const withItems = await addItems(staff, tab.id, { items: [{ drinkId: drink.id, qty: 3 }] });
    const itemId = withItems.items[0].id;
    const paid = await addPayment(staff, tab.id, { method: "cash", items: [{ itemId, qty: 2 }] });
    expect(paid.paidCents).toBe(drink.cents * 2);
    expect(paid.items[0].paidQty).toBe(2);
    expect(await code(addPayment(staff, tab.id, { method: "cash", items: [{ itemId, qty: 2 }] }))).toBe("item_already_paid");
    // A paid drink can't be voided or changed until that payment is refunded.
    expect(await code(changeItem(owner, tab.id, itemId, { action: "void" }))).toBe("item_paid");
  });

  it("never books the same Tap to Pay intent twice", async () => {
    const tab = await openTab(staff, { label: "Karte" });
    await addItems(staff, tab.id, { items: [{ drinkId: drink.id, qty: 4 }] });
    await addPayment(staff, tab.id, { method: "tap_to_pay", amountCents: drink.cents }, "pi_123");
    // A retry that slipped past the route's first check is stopped inside the transaction.
    expect(await code(addPayment(staff, tab.id, { method: "tap_to_pay", amountCents: drink.cents }, "pi_123"))).toBe("payment_conflict");
    expect((await getTab(tab.id)).payments).toHaveLength(1);
  });

  it("lets owners take a cash payment back, once", async () => {
    const tab = await openTab(staff, { label: "R" });
    await addItems(staff, tab.id, { items: [{ drinkId: drink.id }] });
    const paid = await addPayment(staff, tab.id, { method: "cash", amountCents: drink.cents });
    await closeTab(staff, tab.id, "close");
    const refunded = await refundPayment(owner, paid.payments[0].id);
    expect(refunded).toMatchObject({ status: "on_account", balanceCents: drink.cents });
    expect(await code(refundPayment(owner, paid.payments[0].id))).toBe("payment_not_refundable");
  });
});

describe("staff permissions", () => {
  it("staff may take back their own fresh entry, not someone else's or an old one", async () => {
    const tab = await openTab(staff, { label: "V" });
    const withItems = await addItems(staff, tab.id, { items: [{ drinkId: drink.id, qty: 3 }] });
    const itemId = withItems.items[0].id;
    expect(await code(changeItem(otherStaff, tab.id, itemId, { action: "void" }))).toBe("void_needs_owner");
    expect(await code(changeItem(otherStaff, tab.id, itemId, { action: "qty", qty: 1 }))).toBe("void_needs_owner");

    await testDb()`update tab_items set added_at = now() - interval '1 hour' where id = ${itemId}`;
    // Lowering the quantity is a void too: after ten minutes only an owner may.
    expect(await code(changeItem(staff, tab.id, itemId, { action: "qty", qty: 1 }))).toBe("void_needs_owner");
    expect(await code(changeItem(staff, tab.id, itemId, { action: "void" }))).toBe("void_needs_owner");
    expect((await changeItem(staff, tab.id, itemId, { action: "qty", qty: 5 })).items[0].qty).toBe(5);
    expect((await changeItem(owner, tab.id, itemId, { action: "qty", qty: 1 })).items[0].qty).toBe(1);
  });

  it("only owners give drinks on the house, void or reopen tabs", async () => {
    const tab = await openTab(staff, { label: "H" });
    const withItems = await addItems(staff, tab.id, { items: [{ drinkId: drink.id }] });
    expect(await code(changeItem(staff, tab.id, withItems.items[0].id, { action: "on_house" }))).toBe("on_house_needs_owner");
    expect(await code(closeTab(staff, tab.id, "void"))).toBe("void_needs_owner");
    const free = await changeItem(owner, tab.id, withItems.items[0].id, { action: "on_house" });
    expect(free.balanceCents).toBe(0);
    await closeTab(staff, tab.id, "close");
    expect(await code(closeTab(staff, tab.id, "reopen"))).toBe("reopen_needs_owner");
    expect((await closeTab(owner, tab.id, "reopen")).status).toBe("open");
  });

  it("staff cannot move an on-account tab (and its debt) to another guest", async () => {
    const anna = await createCustomer(staff, { name: "Anna" });
    const ben = await createCustomer(staff, { name: "Ben" });
    const tab = await openTab(staff, { customerId: anna.id });
    await addItems(staff, tab.id, { items: [{ drinkId: drink.id }] });
    await closeTab(staff, tab.id, "on_account");
    expect(await code(updateTab(staff, tab.id, { customerId: ben.id }))).toBe("customer_change_needs_owner");
    // Notes and labels stay editable.
    expect((await updateTab(staff, tab.id, { note: "zahlt Freitag" })).note).toBe("zahlt Freitag");
    expect((await updateTab(owner, tab.id, { customerId: ben.id })).customer?.id).toBe(ben.id);
  });

  it("only owners change a guest's credit limit", async () => {
    const guest = await createCustomer(staff, { name: "Carla" });
    expect(await code(createCustomer(staff, { name: "" }))).toBe("name_required");
    expect(await code(updateCustomer(staff, guest.id, { creditLimitCents: 5000 }))).toBe("credit_limit_needs_owner");
    expect((await updateCustomer(owner, guest.id, { creditLimitCents: 5000 })).creditLimitCents).toBe(5000);
  });
});

describe("closing and settling up", () => {
  it("closes only a paid tab and puts unpaid ones on a guest's account", async () => {
    const tab = await openTab(staff, { label: "Z" });
    await addItems(staff, tab.id, { items: [{ drinkId: drink.id }] });
    expect(await code(closeTab(staff, tab.id, "close"))).toBe("balance_not_zero");
    expect(await code(closeTab(staff, tab.id, "on_account"))).toBe("on_account_needs_customer");
  });

  it("settles a guest's debt oldest tab first and closes paid-off tabs", async () => {
    const guest = await createCustomer(staff, { name: "Dieter" });
    for (const label of ["Mo", "Di"]) {
      const tab = await openTab(staff, { customerId: guest.id, label });
      await addItems(staff, tab.id, { items: [{ drinkId: drink.id }] });
      await closeTab(staff, tab.id, "on_account");
    }
    expect((await getCustomer(guest.id)).balanceCents).toBe(drink.cents * 2);
    expect(await code(settleCustomer(staff, guest.id, { method: "cash", amountCents: drink.cents * 2 + 1 }))).toBe("amount_exceeds_balance");
    const after = await settleCustomer(staff, guest.id, { method: "cash", amountCents: drink.cents });
    expect(after.balanceCents).toBe(drink.cents);
    expect(after.tabs.map((t) => `${t.label}:${t.status}`).sort()).toEqual(["Di:on_account", "Mo:closed"]);
  });

  it("adds up the day's figures", async () => {
    const tab = await openTab(staff, { label: "S" });
    await addItems(staff, tab.id, { items: [{ drinkId: drink.id, qty: 2 }] });
    await addPayment(staff, tab.id, { method: "cash", amountCents: drink.cents, tipCents: 100 });
    const [{ d: today }] = (await testDb()`select (now() at time zone 'Europe/Berlin')::date::text as d`) as { d: string }[];
    const figures = await stats(today, today);
    expect(figures).toMatchObject({ revenueCents: drink.cents, tipsCents: 100, paymentCount: 1 });
    expect(figures.openTabs).toEqual({ count: 1, balanceCents: drink.cents });
  });
});
