import "server-only";
import { randomUUID } from "node:crypto";
import { ApiError, type AppUser } from "@/lib/app-auth";
import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { getSite } from "@/lib/store";

/*
  Deckel: tabs, the drinks on them, payments and the guests who run them.

  Money is integer cents everywhere. A tab's total counts every drink that is
  neither voided nor on the house; what it still owes is that total minus
  every payment that wasn't refunded.

  Tab states:
    open        running tonight
    closed      settled, nothing owed
    on_account  closed for the night but unpaid: becomes the guest's debt (anschreiben)
    void        cancelled by an owner
*/

export type TabMode = "pay_as_you_go" | "pay_later";
export type TabStatus = "open" | "closed" | "on_account" | "void";
export type PayMethod = "cash" | "card_terminal" | "tap_to_pay" | "other";
export const PAY_METHODS: PayMethod[] = ["cash", "card_terminal", "tap_to_pay", "other"];

export interface TabSummary {
  id: string;
  number: number;
  label: string;
  table: string;
  mode: TabMode;
  status: TabStatus;
  note: string;
  customer: { id: string; name: string } | null;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  itemCount: number;
  lastActivityAt: string;
}

export interface TabItem {
  id: string;
  drinkId: string;
  name: string;
  size: string;
  category: string;
  unitPriceCents: number;
  qty: number;
  onHouse: boolean;
  addedAt: string;
  addedBy: string;
  voided: boolean;
  voidReason: string;
}

export interface Payment {
  id: string;
  tabId: string | null;
  amountCents: number;
  tipCents: number;
  method: PayMethod;
  takenAt: string;
  takenBy: string;
  refunded: boolean;
  note: string;
}

export interface TabDetail extends TabSummary {
  items: TabItem[];
  payments: Payment[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  creditLimitCents: number;
  regular: boolean;
  archived: boolean;
  createdAt: string;
  balanceCents: number; // what they owe across open and on-account tabs
  totalSpentCents: number;
  visits: number;
  lastVisitAt: string | null;
  openTabId: string | null;
}

/* ---------- Helpers ---------- */

export const toCents = (price: string | number) => Math.round(Number(String(price).replace(",", ".")) * 100);
const iso = (value: string | Date | null) => (value ? new Date(value).toISOString() : null);

function text(value: unknown, max: number, field: string, required = false) {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) throw new ApiError(422, `${field}_required`);
  if (s.length > max) throw new ApiError(422, `${field}_too_long`);
  return s;
}

function cents(value: unknown, field: string, { min = 0, max = 1_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new ApiError(422, `${field}_invalid`);
  return n;
}

const uuid = (value: unknown, field: string) => {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) throw new ApiError(422, `${field}_invalid`);
  return value;
};

/* ---------- Reading ---------- */

const SUMMARY_SQL = `
  select t.id, t.number, t.label, t.table_label, t.mode, t.status, t.note, t.opened_at, t.closed_at, t.updated_at,
         c.id as customer_id, c.name as customer_name,
         coalesce(u.name, u.email, '') as opened_by,
         coalesce(i.total, 0)::int as total_cents,
         coalesce(i.count, 0)::int as item_count,
         coalesce(i.last_at, t.opened_at) as last_item_at,
         coalesce(p.paid, 0)::int as paid_cents,
         coalesce(p.last_at, t.opened_at) as last_pay_at
  from tabs t
  left join customers c on c.id = t.customer_id
  left join users u on u.id = t.opened_by
  left join lateral (
    select sum(case when on_house then 0 else unit_price_cents * qty end) as total,
           sum(qty) as count, max(added_at) as last_at
    from tab_items where tab_id = t.id and voided_at is null
  ) i on true
  left join lateral (
    select sum(amount_cents) as paid, max(taken_at) as last_at from payments where tab_id = t.id and refunded_at is null
  ) p on true`;

interface SummaryRow {
  id: string;
  number: number;
  label: string;
  table_label: string;
  mode: TabMode;
  status: TabStatus;
  note: string;
  opened_at: string;
  closed_at: string | null;
  updated_at: string;
  customer_id: string | null;
  customer_name: string | null;
  opened_by: string;
  total_cents: number;
  item_count: number;
  last_item_at: string;
  paid_cents: number;
  last_pay_at: string;
}

const toSummary = (r: SummaryRow): TabSummary => ({
  id: r.id,
  number: r.number,
  label: r.label,
  table: r.table_label,
  mode: r.mode,
  status: r.status,
  note: r.note,
  customer: r.customer_id ? { id: r.customer_id, name: r.customer_name ?? "" } : null,
  openedAt: iso(r.opened_at)!,
  closedAt: iso(r.closed_at),
  openedBy: r.opened_by,
  totalCents: r.total_cents,
  paidCents: r.paid_cents,
  balanceCents: r.total_cents - r.paid_cents,
  itemCount: r.item_count,
  lastActivityAt: iso([r.updated_at, r.last_item_at, r.last_pay_at].sort().at(-1)!)!,
});

export async function listTabs(filter: { status?: "open" | "on_account" | "closed_on"; date?: string; customerId?: string }) {
  const sql = db();
  let where = "where t.status = 'open'";
  const args: unknown[] = [];
  if (filter.customerId) {
    args.push(filter.customerId);
    where = `where t.customer_id = $1`;
  } else if (filter.status === "on_account") where = "where t.status = 'on_account'";
  else if (filter.status === "closed_on") {
    args.push(filter.date);
    where = `where t.status in ('closed', 'on_account', 'void') and (t.closed_at at time zone 'Europe/Berlin')::date = $1::date`;
  }
  const order = filter.status === "closed_on" || filter.customerId ? "order by coalesce(t.closed_at, t.opened_at) desc" : "order by t.opened_at";
  const rows = (await sql.query(`${SUMMARY_SQL} ${where} ${order} limit 500`, args)) as SummaryRow[];
  return rows.map(toSummary);
}

export async function getTab(id: string): Promise<TabDetail> {
  const sql = db();
  const [rows, items, payments] = await Promise.all([
    sql.query(`${SUMMARY_SQL} where t.id = $1`, [uuid(id, "tab")]) as unknown as Promise<SummaryRow[]>,
    sql`
      select i.id, i.drink_id, i.name, i.size, i.category, i.unit_price_cents, i.qty, i.on_house, i.added_at,
             coalesce(u.name, u.email, '') as added_by, i.voided_at, i.void_reason
      from tab_items i left join users u on u.id = i.added_by
      where i.tab_id = ${id} order by i.added_at, i.id
    ` as unknown as Promise<Record<string, unknown>[]>,
    sql`
      select p.id, p.tab_id, p.amount_cents, p.tip_cents, p.method, p.taken_at, coalesce(u.name, u.email, '') as taken_by,
             p.refunded_at, p.note
      from payments p left join users u on u.id = p.taken_by
      where p.tab_id = ${id} order by p.taken_at
    ` as unknown as Promise<Record<string, unknown>[]>,
  ]);
  if (!rows[0]) throw new ApiError(404, "tab_not_found");
  return {
    ...toSummary(rows[0]),
    items: items.map((i) => ({
      id: i.id as string,
      drinkId: i.drink_id as string,
      name: i.name as string,
      size: i.size as string,
      category: i.category as string,
      unitPriceCents: i.unit_price_cents as number,
      qty: i.qty as number,
      onHouse: i.on_house as boolean,
      addedAt: iso(i.added_at as string)!,
      addedBy: i.added_by as string,
      voided: Boolean(i.voided_at),
      voidReason: i.void_reason as string,
    })),
    payments: payments.map(toPayment),
  };
}

const toPayment = (p: Record<string, unknown>): Payment => ({
  id: p.id as string,
  tabId: (p.tab_id as string) ?? null,
  amountCents: p.amount_cents as number,
  tipCents: p.tip_cents as number,
  method: p.method as PayMethod,
  takenAt: iso(p.taken_at as string)!,
  takenBy: (p.taken_by as string) ?? "",
  refunded: Boolean(p.refunded_at),
  note: (p.note as string) ?? "",
});

/* Every payment taken on one day (Berlin time), newest first, with the tab and guest it belongs to. For the admin portal. */
export async function paymentsOn(date: string) {
  const rows = (await db()`
    select p.id, p.tab_id, p.amount_cents, p.tip_cents, p.method, p.taken_at, coalesce(u.name, u.email, '') as taken_by, p.refunded_at, p.note,
           t.number as tab_number, t.label as tab_label, c.name as customer_name
    from payments p
    left join users u on u.id = p.taken_by
    left join tabs t on t.id = p.tab_id
    left join customers c on c.id = coalesce(p.customer_id, t.customer_id)
    where (p.taken_at at time zone 'Europe/Berlin')::date = ${date}::date
    order by p.taken_at desc limit 500
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    ...toPayment(r),
    tabNumber: (r.tab_number as number | null) ?? null,
    tabLabel: (r.tab_label as string | null) ?? null,
    customerName: (r.customer_name as string | null) ?? null,
  }));
}

/* ---------- Tabs ---------- */

export async function openTab(user: AppUser, input: Record<string, unknown>) {
  const mode: TabMode = input.mode === "pay_as_you_go" ? "pay_as_you_go" : "pay_later";
  const customerId = input.customerId ? uuid(input.customerId, "customer") : null;
  let label = text(input.label, 60, "label");
  const sql = db();
  if (customerId) {
    const [c] = (await sql`select name, archived from customers where id = ${customerId}`) as { name: string; archived: boolean }[];
    if (!c || c.archived) throw new ApiError(404, "customer_not_found");
    label ||= c.name;
    const [existing] = (await sql`select id from tabs where customer_id = ${customerId} and status = 'open' limit 1`) as { id: string }[];
    if (existing) throw new ApiError(409, "customer_has_open_tab", existing.id);
  }
  if (!label) throw new ApiError(422, "label_required");
  const [row] = (await sql`
    insert into tabs (customer_id, label, table_label, mode, note, opened_by)
    values (${customerId}, ${label}, ${text(input.table, 20, "table")}, ${mode}, ${text(input.note, 200, "note")}, ${user.id})
    returning id, number
  `) as { id: string; number: number }[];
  await logActivity(user, "Deckel eröffnet", "tab", row.id, `#${row.number} ${label}`);
  return getTab(row.id);
}

async function lockedTab(id: string, { allowClosed = false } = {}) {
  const [tab] = (await db()`select id, number, label, status, mode, customer_id from tabs where id = ${uuid(id, "tab")}`) as {
    id: string;
    number: number;
    label: string;
    status: TabStatus;
    mode: TabMode;
    customer_id: string | null;
  }[];
  if (!tab) throw new ApiError(404, "tab_not_found");
  if (!allowClosed && tab.status !== "open") throw new ApiError(409, "tab_not_open");
  return tab;
}

export async function updateTab(user: AppUser, id: string, input: Record<string, unknown>) {
  const tab = await lockedTab(id, { allowClosed: true });
  const sql = db();
  const label = input.label !== undefined ? text(input.label, 60, "label", true) : tab.label;
  const mode: TabMode = input.mode === "pay_as_you_go" || input.mode === "pay_later" ? input.mode : tab.mode;
  let customerId = tab.customer_id;
  if (input.customerId !== undefined) {
    customerId = input.customerId ? uuid(input.customerId, "customer") : null;
    if (customerId) {
      const [c] = (await sql`select id from customers where id = ${customerId} and not archived`) as unknown[];
      if (!c) throw new ApiError(404, "customer_not_found");
    }
  }
  await sql`
    update tabs set label = ${label}, mode = ${mode}, customer_id = ${customerId},
      table_label = coalesce(${input.table !== undefined ? text(input.table, 20, "table") : null}, table_label),
      note = coalesce(${input.note !== undefined ? text(input.note, 200, "note") : null}, note),
      updated_at = now()
    where id = ${id}
  `;
  await logActivity(user, "Deckel geändert", "tab", id, `#${tab.number} ${label}`);
  return getTab(id);
}

/*
  Adds drinks by menu id. Names and prices always come from the live menu on
  the server, never from the tablet, so a modified app can't sell at its own prices.
*/
export async function addItems(user: AppUser, id: string, input: Record<string, unknown>) {
  const tab = await lockedTab(id);
  const lines = Array.isArray(input.items) ? input.items : [];
  if (lines.length === 0 || lines.length > 40) throw new ApiError(422, "items_invalid");
  const site = await getSite();
  const menu = new Map(site.menu.flatMap((c) => c.drinks.map((d) => [d.id, { ...d, category: c.label }] as const)));
  const sql = db();
  const queries = [];
  let roundCents = 0;
  const names: string[] = [];
  for (const raw of lines as Record<string, unknown>[]) {
    const drink = menu.get(String(raw.drinkId ?? ""));
    if (!drink) throw new ApiError(422, "drink_not_found", String(raw.drinkId));
    if (drink.soldOut) throw new ApiError(409, "drink_sold_out", drink.name);
    const qty = cents(raw.qty ?? 1, "qty", { min: 1, max: 99 });
    const price = toCents(drink.price);
    roundCents += price * qty;
    names.push(`${qty}× ${drink.name}`);
    queries.push(sql`
      insert into tab_items (tab_id, drink_id, name, size, category, unit_price_cents, qty, added_by)
      values (${id}, ${drink.id}, ${drink.name}, ${drink.size}, ${drink.category}, ${price}, ${qty}, ${user.id})
    `);
  }
  // "Pay as you go": the round is paid in the same breath it is poured.
  const payNow = input.payNow as Record<string, unknown> | undefined;
  if (payNow) {
    const method = PAY_METHODS.includes(payNow.method as PayMethod) ? (payNow.method as PayMethod) : null;
    if (!method || method === "tap_to_pay") throw new ApiError(422, "method_invalid");
    queries.push(sql`
      insert into payments (tab_id, customer_id, amount_cents, tip_cents, method, taken_by, note)
      values (${id}, ${tab.customer_id}, ${roundCents}, ${cents(payNow.tipCents ?? 0, "tip", { max: 100_000 })}, ${method}, ${user.id}, 'Runde')
    `);
  }
  queries.push(sql`update tabs set updated_at = now() where id = ${id}`);
  await sql.transaction(queries);
  await logActivity(user, payNow ? "Runde bezahlt" : "Getränke gebucht", "tab", id, `#${tab.number} ${tab.label}: ${names.join(", ")}`);
  return getTab(id);
}

export async function changeItem(user: AppUser, tabId: string, itemId: string, input: Record<string, unknown>) {
  const tab = await lockedTab(tabId);
  const sql = db();
  const [item] = (await sql`select id, name, qty, added_at, added_by, voided_at from tab_items where id = ${uuid(itemId, "item")} and tab_id = ${tabId}`) as {
    id: string;
    name: string;
    qty: number;
    added_at: string;
    added_by: string | null;
    voided_at: string | null;
  }[];
  if (!item) throw new ApiError(404, "item_not_found");

  if (input.action === "void") {
    if (item.voided_at) throw new ApiError(409, "item_already_voided");
    // Staff may take back their own entries for ten minutes; owners can always.
    const fresh = Date.now() - new Date(item.added_at).getTime() < 10 * 60 * 1000;
    if (user.role !== "owner" && !(fresh && item.added_by === user.id)) throw new ApiError(403, "void_needs_owner");
    const reason = text(input.reason, 120, "reason") || "Storniert";
    await sql`update tab_items set voided_at = now(), voided_by = ${user.id}, void_reason = ${reason} where id = ${itemId}`;
    await logActivity(user, "Getränk storniert", "tab", tabId, `#${tab.number} ${tab.label}: ${item.qty}× ${item.name} (${reason})`);
  } else if (input.action === "on_house" || input.action === "charge") {
    if (user.role !== "owner") throw new ApiError(403, "on_house_needs_owner");
    const onHouse = input.action === "on_house";
    await sql`update tab_items set on_house = ${onHouse} where id = ${itemId}`;
    await logActivity(user, onHouse ? "Aufs Haus" : "Wieder berechnet", "tab", tabId, `#${tab.number} ${tab.label}: ${item.qty}× ${item.name}`);
  } else if (input.action === "qty") {
    if (item.voided_at) throw new ApiError(409, "item_already_voided");
    const qty = cents(input.qty, "qty", { min: 1, max: 99 });
    if (qty < item.qty && user.role !== "owner" && item.added_by !== user.id) throw new ApiError(403, "void_needs_owner");
    await sql`update tab_items set qty = ${qty} where id = ${itemId}`;
    await logActivity(user, "Menge geändert", "tab", tabId, `#${tab.number} ${tab.label}: ${item.name} ${item.qty} → ${qty}`);
  } else throw new ApiError(422, "action_invalid");
  await sql`update tabs set updated_at = now() where id = ${tabId}`;
  return getTab(tabId);
}

export async function addPayment(user: AppUser, tabId: string, input: Record<string, unknown>, stripeIntent = "") {
  const tab = await lockedTab(tabId, { allowClosed: true });
  if (tab.status === "void" || tab.status === "closed") throw new ApiError(409, "tab_not_open");
  const method = PAY_METHODS.includes(input.method as PayMethod) ? (input.method as PayMethod) : null;
  if (!method) throw new ApiError(422, "method_invalid");
  if (method === "tap_to_pay" && !stripeIntent) throw new ApiError(422, "tap_to_pay_needs_stripe");
  const current = await getTab(tabId);
  const amount = cents(input.amountCents, "amount", { min: 1 });
  if (amount > current.balanceCents) throw new ApiError(422, "amount_exceeds_balance");
  const tip = cents(input.tipCents ?? 0, "tip", { max: 100_000 });
  await db()`
    insert into payments (tab_id, customer_id, amount_cents, tip_cents, method, stripe_payment_intent, taken_by, note)
    values (${tabId}, ${tab.customer_id}, ${amount}, ${tip}, ${method}, ${stripeIntent}, ${user.id}, ${text(input.note, 120, "note")})
  `;
  await db()`update tabs set updated_at = now() where id = ${tabId}`;
  await logActivity(user, "Zahlung", "tab", tabId, `#${tab.number} ${tab.label}: ${(amount / 100).toFixed(2)} € ${method}${tip ? ` + ${(tip / 100).toFixed(2)} € Trinkgeld` : ""}`);
  const after = await getTab(tabId);
  // A fully paid tab that was carried on account closes itself.
  if (after.status === "on_account" && after.balanceCents === 0) {
    await db()`update tabs set status = 'closed', updated_at = now() where id = ${tabId}`;
    return getTab(tabId);
  }
  return after;
}

export async function refundPayment(user: AppUser, paymentId: string) {
  const [p] = (await db()`
    update payments set refunded_at = now(), refunded_by = ${user.id}
    where id = ${uuid(paymentId, "payment")} and refunded_at is null and method <> 'tap_to_pay'
    returning tab_id, amount_cents, method
  `) as { tab_id: string | null; amount_cents: number; method: string }[];
  if (!p) throw new ApiError(404, "payment_not_refundable");
  if (p.tab_id) await db()`update tabs set status = case when status = 'closed' then 'on_account' else status end, updated_at = now() where id = ${p.tab_id}`;
  await logActivity(user, "Zahlung zurückgenommen", "payment", paymentId, `${(p.amount_cents / 100).toFixed(2)} € ${p.method}`);
  return p.tab_id ? getTab(p.tab_id) : { ok: true };
}

export async function closeTab(user: AppUser, id: string, action: unknown) {
  const tab = await lockedTab(id, { allowClosed: true });
  const current = await getTab(id);
  const sql = db();
  if (action === "close") {
    if (tab.status !== "open") throw new ApiError(409, "tab_not_open");
    if (current.balanceCents !== 0) throw new ApiError(409, "balance_not_zero");
    await sql`update tabs set status = 'closed', closed_at = now(), closed_by = ${user.id}, updated_at = now() where id = ${id}`;
    await logActivity(user, "Deckel abgeschlossen", "tab", id, `#${tab.number} ${tab.label}: ${(current.totalCents / 100).toFixed(2)} €`);
  } else if (action === "on_account") {
    if (tab.status !== "open") throw new ApiError(409, "tab_not_open");
    if (!tab.customer_id) throw new ApiError(409, "on_account_needs_customer");
    if (current.balanceCents <= 0) throw new ApiError(409, "nothing_owed");
    const [c] = (await sql`select credit_limit_cents from customers where id = ${tab.customer_id}`) as { credit_limit_cents: number }[];
    const owed = await customerBalance(tab.customer_id);
    if (c && c.credit_limit_cents > 0 && owed > c.credit_limit_cents && user.role !== "owner") throw new ApiError(403, "credit_limit_exceeded");
    await sql`update tabs set status = 'on_account', closed_at = now(), closed_by = ${user.id}, updated_at = now() where id = ${id}`;
    await logActivity(user, "Angeschrieben", "tab", id, `#${tab.number} ${tab.label}: ${(current.balanceCents / 100).toFixed(2)} € offen`);
  } else if (action === "void") {
    if (user.role !== "owner") throw new ApiError(403, "void_needs_owner");
    if (current.paidCents > 0) throw new ApiError(409, "tab_has_payments");
    await sql.transaction([
      sql`update tab_items set voided_at = coalesce(voided_at, now()), voided_by = coalesce(voided_by, ${user.id}), void_reason = case when voided_at is null then 'Deckel storniert' else void_reason end where tab_id = ${id}`,
      sql`update tabs set status = 'void', closed_at = now(), closed_by = ${user.id}, updated_at = now() where id = ${id}`,
    ]);
    await logActivity(user, "Deckel storniert", "tab", id, `#${tab.number} ${tab.label}`);
  } else if (action === "reopen") {
    if (tab.status === "open") throw new ApiError(409, "tab_already_open");
    if (user.role !== "owner") throw new ApiError(403, "reopen_needs_owner");
    if (tab.customer_id) {
      const [other] = (await sql`select id from tabs where customer_id = ${tab.customer_id} and status = 'open' and id <> ${id}`) as unknown[];
      if (other) throw new ApiError(409, "customer_has_open_tab");
    }
    await sql`update tabs set status = 'open', closed_at = null, closed_by = null, updated_at = now() where id = ${id}`;
    await logActivity(user, "Deckel wieder geöffnet", "tab", id, `#${tab.number} ${tab.label}`);
  } else throw new ApiError(422, "action_invalid");
  return getTab(id);
}

/* ---------- Guests ---------- */

const CUSTOMER_SQL = `
  select c.*,
    coalesce((select sum(case when i.on_house then 0 else i.unit_price_cents * i.qty end)
              from tab_items i join tabs t on t.id = i.tab_id
              where t.customer_id = c.id and t.status in ('open', 'on_account') and i.voided_at is null), 0)::int
    - coalesce((select sum(p.amount_cents) from payments p join tabs t on t.id = p.tab_id
                where t.customer_id = c.id and t.status in ('open', 'on_account') and p.refunded_at is null), 0)::int as balance_cents,
    coalesce((select sum(p.amount_cents) from payments p where p.customer_id = c.id and p.refunded_at is null), 0)::int as spent_cents,
    (select count(distinct (t.opened_at at time zone 'Europe/Berlin')::date) from tabs t where t.customer_id = c.id and t.status <> 'void')::int as visits,
    (select max(t.opened_at) from tabs t where t.customer_id = c.id) as last_visit_at,
    (select t.id from tabs t where t.customer_id = c.id and t.status = 'open' limit 1) as open_tab_id
  from customers c`;

const toCustomer = (r: Record<string, unknown>): Customer => ({
  id: r.id as string,
  name: r.name as string,
  phone: r.phone as string,
  email: r.email as string,
  note: r.note as string,
  creditLimitCents: r.credit_limit_cents as number,
  regular: r.regular as boolean,
  archived: r.archived as boolean,
  createdAt: iso(r.created_at as string)!,
  balanceCents: r.balance_cents as number,
  totalSpentCents: r.spent_cents as number,
  visits: r.visits as number,
  lastVisitAt: iso(r.last_visit_at as string | null),
  openTabId: (r.open_tab_id as string) ?? null,
});

async function customerBalance(id: string) {
  const [row] = (await db().query(`${CUSTOMER_SQL} where c.id = $1`, [id])) as Record<string, unknown>[];
  return row ? (row.balance_cents as number) : 0;
}

export async function listCustomers(query: string, { owing = false, archived = false } = {}) {
  const q = query.trim().toLowerCase();
  const rows = (await db().query(
    `select * from (${CUSTOMER_SQL} where c.archived = $2 and ($1 = '' or lower(c.name) like '%' || $1 || '%' or c.phone like '%' || $1 || '%' or lower(c.email) like '%' || $1 || '%')) x
     ${owing ? "where balance_cents > 0" : ""}
     order by regular desc, coalesce(last_visit_at, created_at) desc limit 300`,
    [q, archived],
  )) as Record<string, unknown>[];
  return rows.map(toCustomer);
}

export async function getCustomer(id: string) {
  const sql = db();
  const [row] = (await sql.query(`${CUSTOMER_SQL} where c.id = $1`, [uuid(id, "customer")])) as Record<string, unknown>[];
  if (!row) throw new ApiError(404, "customer_not_found");
  const [tabs, favourites, payments] = await Promise.all([
    listTabs({ customerId: id }),
    sql`
      select i.name, i.size, sum(i.qty)::int as qty
      from tab_items i join tabs t on t.id = i.tab_id
      where t.customer_id = ${id} and i.voided_at is null
      group by i.name, i.size order by qty desc limit 5
    ` as unknown as Promise<{ name: string; size: string; qty: number }[]>,
    sql`
      select p.id, p.tab_id, p.amount_cents, p.tip_cents, p.method, p.taken_at, coalesce(u.name, u.email, '') as taken_by, p.refunded_at, p.note
      from payments p left join users u on u.id = p.taken_by
      where p.customer_id = ${id} order by p.taken_at desc limit 50
    ` as unknown as Promise<Record<string, unknown>[]>,
  ]);
  return { ...toCustomer(row), tabs: tabs.slice(0, 50), favourites, payments: payments.map(toPayment) };
}

function customerFields(input: Record<string, unknown>, existing?: Record<string, unknown>) {
  const email = text(input.email ?? existing?.email ?? "", 120, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(422, "email_invalid");
  return {
    name: text(input.name ?? existing?.name, 80, "name", true),
    phone: text(input.phone ?? existing?.phone ?? "", 30, "phone"),
    email,
    note: text(input.note ?? existing?.note ?? "", 400, "note"),
    credit: cents(input.creditLimitCents ?? existing?.credit_limit_cents ?? 0, "credit_limit", { max: 500_000 }),
    regular: input.regular !== undefined ? input.regular === true : Boolean(existing?.regular),
  };
}

export async function createCustomer(user: AppUser, input: Record<string, unknown>) {
  const f = customerFields(input);
  const [row] = (await db()`
    insert into customers (name, phone, email, note, credit_limit_cents, regular, created_by)
    values (${f.name}, ${f.phone}, ${f.email}, ${f.note}, ${f.credit}, ${f.regular}, ${user.id})
    returning id
  `) as { id: string }[];
  await logActivity(user, "Gast angelegt", "customer", row.id, f.name);
  return getCustomer(row.id);
}

export async function updateCustomer(user: AppUser, id: string, input: Record<string, unknown>) {
  const sql = db();
  const [existing] = (await sql`select * from customers where id = ${uuid(id, "customer")}`) as Record<string, unknown>[];
  if (!existing) throw new ApiError(404, "customer_not_found");
  const f = customerFields(input, existing);
  if (f.credit !== existing.credit_limit_cents && user.role !== "owner") throw new ApiError(403, "credit_limit_needs_owner");
  const archived = input.archived !== undefined ? input.archived === true : (existing.archived as boolean);
  if (archived && !existing.archived && (await customerBalance(id)) > 0) throw new ApiError(409, "customer_owes_money");
  await sql`
    update customers set name = ${f.name}, phone = ${f.phone}, email = ${f.email}, note = ${f.note},
      credit_limit_cents = ${f.credit}, regular = ${f.regular}, archived = ${archived}
    where id = ${id}
  `;
  await logActivity(user, archived && !existing.archived ? "Gast archiviert" : "Gast geändert", "customer", id, f.name);
  return getCustomer(id);
}

/* Settles what a guest owes, oldest tab first, across every open or on-account tab. */
export async function settleCustomer(user: AppUser, id: string, input: Record<string, unknown>) {
  const sql = db();
  const method = PAY_METHODS.includes(input.method as PayMethod) ? (input.method as PayMethod) : null;
  if (!method || method === "tap_to_pay") throw new ApiError(422, "method_invalid");
  let left = cents(input.amountCents, "amount", { min: 1 });
  const tabs = (await listTabs({ customerId: uuid(id, "customer") }))
    .filter((t) => (t.status === "on_account" || t.status === "open") && t.balanceCents > 0)
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const owed = tabs.reduce((n, t) => n + t.balanceCents, 0);
  if (left > owed) throw new ApiError(422, "amount_exceeds_balance");
  const queries = [];
  for (const tab of tabs) {
    if (left <= 0) break;
    const part = Math.min(left, tab.balanceCents);
    left -= part;
    queries.push(sql`
      insert into payments (id, tab_id, customer_id, amount_cents, method, taken_by, note)
      values (${randomUUID()}, ${tab.id}, ${id}, ${part}, ${method}, ${user.id}, 'Schulden beglichen')
    `);
    if (tab.status === "on_account" && part === tab.balanceCents) queries.push(sql`update tabs set status = 'closed', updated_at = now() where id = ${tab.id}`);
  }
  await sql.transaction(queries);
  await logActivity(user, "Schulden beglichen", "customer", id, `${(Number(input.amountCents) / 100).toFixed(2)} € ${method}`);
  return getCustomer(id);
}

/* ---------- Figures ---------- */

export async function stats(from: string, to: string) {
  const sql = db();
  const range = [from, to];
  const [[money], byMethod, top, hourly, [open], [debts], [voids]] = await Promise.all([
    sql.query(
      `select coalesce(sum(amount_cents), 0)::int as revenue, coalesce(sum(tip_cents), 0)::int as tips, count(*)::int as payments
       from payments where refunded_at is null and (taken_at at time zone 'Europe/Berlin')::date between $1::date and $2::date`,
      range,
    ) as unknown as Promise<{ revenue: number; tips: number; payments: number }[]>,
    sql.query(
      `select method, coalesce(sum(amount_cents), 0)::int as amount, coalesce(sum(tip_cents), 0)::int as tips, count(*)::int as count
       from payments where refunded_at is null and (taken_at at time zone 'Europe/Berlin')::date between $1::date and $2::date
       group by method order by amount desc`,
      range,
    ) as unknown as Promise<{ method: PayMethod; amount: number; tips: number; count: number }[]>,
    sql.query(
      `select i.name, i.size, sum(i.qty)::int as qty, sum(case when i.on_house then 0 else i.unit_price_cents * i.qty end)::int as revenue
       from tab_items i where i.voided_at is null and (i.added_at at time zone 'Europe/Berlin')::date between $1::date and $2::date
       group by i.name, i.size order by qty desc limit 10`,
      range,
    ) as unknown as Promise<{ name: string; size: string; qty: number; revenue: number }[]>,
    sql.query(
      `select extract(hour from taken_at at time zone 'Europe/Berlin')::int as hour, sum(amount_cents)::int as amount
       from payments where refunded_at is null and (taken_at at time zone 'Europe/Berlin')::date between $1::date and $2::date
       group by hour order by hour`,
      range,
    ) as unknown as Promise<{ hour: number; amount: number }[]>,
    sql.query(`select count(*)::int as count, coalesce(sum(balance), 0)::int as balance from (${SUMMARY_SQL.replace("select t.id,", "select t.id, coalesce(i.total, 0) - coalesce(p.paid, 0) as balance,")} where t.status = 'open') x`) as unknown as Promise<{
      count: number;
      balance: number;
    }[]>,
    sql.query(`select count(distinct customer_id)::int as guests, coalesce(sum(balance), 0)::int as balance from (${SUMMARY_SQL.replace("select t.id,", "select t.id, t.customer_id as cid, coalesce(i.total, 0) - coalesce(p.paid, 0) as balance,")} where t.status = 'on_account') x`) as unknown as Promise<{
      guests: number;
      balance: number;
    }[]>,
    sql.query(
      `select count(*)::int as count, coalesce(sum(unit_price_cents * qty), 0)::int as amount
       from tab_items where voided_at is not null and (voided_at at time zone 'Europe/Berlin')::date between $1::date and $2::date`,
      range,
    ) as unknown as Promise<{ count: number; amount: number }[]>,
  ]);
  return {
    from,
    to,
    revenueCents: money.revenue,
    tipsCents: money.tips,
    paymentCount: money.payments,
    byMethod,
    topDrinks: top,
    hourly,
    openTabs: { count: open.count, balanceCents: open.balance },
    debts: { guests: debts.guests, balanceCents: debts.balance },
    voids: { count: voids.count, amountCents: voids.amount },
  };
}

/* The live menu for the tablet: the same drinks and prices as the website. */
export async function appMenu() {
  const site = await getSite();
  return {
    venue: { name: site.venue.name, street: site.venue.street, city: site.venue.city },
    categories: site.menu.map((c) => ({
      id: c.id,
      label: c.label,
      labelEn: c.sub,
      drinks: c.drinks.map((d) => ({
        id: d.id,
        name: d.name,
        notes: d.notes,
        notesEn: d.notesEn,
        size: d.size,
        priceCents: toCents(d.price),
        image: d.image,
        soldOut: d.soldOut,
        featured: d.featured,
      })),
    })),
    updatedAt: site.updatedAt,
  };
}
