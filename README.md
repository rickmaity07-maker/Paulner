# Paulaner Meets Route 66

Website and admin portal for the bar at Am Zeughaus 8, 97421 Schweinfurt.
German first, English via the DE/EN switch. Next.js 16, Tailwind 4, Neon Postgres.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL at least
npm run db:setup -- owner@example.com "a-long-password"
npm run dev
```

## What's where

| Path | What |
| --- | --- |
| `/` | The site. Content comes from the database and is edited in the portal. |
| `/login` | One login for everyone (same system as Bar-05). Owners go to `/admin`, guests to `/profile`. |
| `/profile` | Guests: their bookings (cancel), details, password, data export, delete account. |
| `/admin` | Owners: dashboard, bookings, drinks menu, taps, opening hours, texts & notice bar, venue & backup, users & roles, activity log. |
| `/impressum`, `/datenschutz` | Legal pages; name, address and contact come from the portal. |

- `db/schema.sql` – tables; `scripts/setup-db.mjs` applies it and creates owners.
- `lib/data.ts` – the starting menu (prices from the printed card) and texts, copied into the database on first load.
- `lib/i18n.ts` – fixed German/English copy. Editable texts carry their own German and English fields.
- `lib/mailer.ts` – booking emails, active once the Gmail variables are set.

Neon project: **paulaner** (`morning-band-07935865`, aws-eu-central-1).
