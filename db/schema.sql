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
