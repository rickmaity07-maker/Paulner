/*
  Creates the tables and, when an email and password are given, an owner account.

    npm run db:setup
    npm run db:setup -- owner@example.com "a-long-password"

  Reads DATABASE_URL from .env.local. Running it again is safe: tables are only
  created when missing, and an existing account is promoted to owner with the
  new password. The menu and texts are copied in on the first page load.
*/
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema
  .replace(/^\s*--.*$/gm, "")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) await sql.query(statement);
console.log(`Schema ready (${statements.length} statements).`);

const [email, password] = process.argv.slice(2);
if (email || password) {
  if (!email?.includes("@") || !password || password.length < 8) {
    console.error("Give an email address and a password of at least 8 characters.");
    process.exit(1);
  }
  // Must match hashPassword() in lib/auth.ts.
  const salt = randomBytes(16).toString("hex");
  const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
  await sql`
    insert into users (email, password_hash, role, active)
    values (${email.trim().toLowerCase()}, ${hash}, 'owner', true)
    on conflict (email) do update
      set password_hash = excluded.password_hash, role = 'owner', active = true
  `;
  console.log(`Owner account ready: ${email.trim().toLowerCase()}`);
}
