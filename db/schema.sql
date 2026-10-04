-- Paulaner Meets Route 66 database schema (Neon Postgres). Applied by scripts/setup-db.mjs; safe to run again.
-- Accounts, sessions and login throttling follow the Bar-05 site exactly.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  phone text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'owner')),
  active boolean not null default true,
  google_sub text unique,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts (email, attempted_at);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  created_at timestamptz not null default now(),
  user_id uuid references users (id) on delete set null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  date date not null,
  time time not null,
  guests integer not null check (guests between 1 and 60),
  note text not null default '',
  locale text not null default 'de',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'seated', 'cancelled', 'no-show')),
  table_label text not null default '',
  staff_note text not null default '',
  source text not null default 'website' check (source in ('website', 'phone', 'walk-in')),
  updated_at timestamptz,
  updated_by uuid references users (id) on delete set null
);
create index if not exists reservations_date_idx on reservations (date, time);
create index if not exists reservations_status_idx on reservations (status);
create index if not exists reservations_user_idx on reservations (user_id);

-- Everything the page says (menu, taps, hours, texts in German and English) as one document the portal edits.
create table if not exists site_content (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null
);

create table if not exists activity_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid references users (id) on delete set null,
  user_email text not null default '',
  action text not null,
  entity text not null default '',
  entity_id text not null default '',
  detail text not null default ''
);
create index if not exists activity_log_at_idx on activity_log (at desc);

-- ---------- Deckel: the tab-keeping tablet app ----------

-- Bartenders: may use the tablet app, but not the admin portal.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('user', 'staff', 'owner'));

-- Regulars and anyone who runs a tab across nights. Money is stored in cents.
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  note text not null default '',
  credit_limit_cents integer not null default 0 check (credit_limit_cents >= 0),
  regular boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references users (id) on delete set null
);
create index if not exists customers_name_idx on customers (lower(name));

-- A tab (Deckel). "pay_as_you_go" settles every round straight away; "pay_later" runs a total.
create sequence if not exists tab_number_seq;
create table if not exists tabs (
  id uuid primary key default gen_random_uuid(),
  number integer not null default nextval('tab_number_seq'),
  customer_id uuid references customers (id) on delete set null,
  label text not null,
  table_label text not null default '',
  mode text not null default 'pay_later' check (mode in ('pay_as_you_go', 'pay_later')),
  status text not null default 'open' check (status in ('open', 'closed', 'on_account', 'void')),
  note text not null default '',
  opened_at timestamptz not null default now(),
  opened_by uuid references users (id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists tabs_status_idx on tabs (status, opened_at desc);
create index if not exists tabs_customer_idx on tabs (customer_id);

-- Every drink on a tab. Name and price are copied at the moment of sale, so later menu edits never rewrite history.
create table if not exists tab_items (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references tabs (id) on delete cascade,
  drink_id text not null default '',
  name text not null,
  size text not null default '',
  category text not null default '',
  unit_price_cents integer not null check (unit_price_cents >= 0),
  qty integer not null check (qty between 1 and 99),
  on_house boolean not null default false,
  added_at timestamptz not null default now(),
  added_by uuid references users (id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references users (id) on delete set null,
  void_reason text not null default ''
);
create index if not exists tab_items_tab_idx on tab_items (tab_id);

-- Money in. A payment belongs to a tab, or to a guest when they settle what they owe across tabs.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references tabs (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  tip_cents integer not null default 0 check (tip_cents >= 0),
  method text not null check (method in ('cash', 'card_terminal', 'tap_to_pay', 'other')),
  stripe_payment_intent text not null default '',
  note text not null default '',
  taken_at timestamptz not null default now(),
  taken_by uuid references users (id) on delete set null,
  refunded_at timestamptz,
  refunded_by uuid references users (id) on delete set null
);
create index if not exists payments_tab_idx on payments (tab_id);
create index if not exists payments_customer_idx on payments (customer_id);
create index if not exists payments_taken_idx on payments (taken_at desc);
