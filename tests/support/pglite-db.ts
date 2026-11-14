import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

/*
  A stand-in for @neondatabase/serverless's neon() function, backed by an
  in-memory Postgres. It supports what the app uses: tagged templates
  (values sent as parameters), sql.query(text, params) and
  sql.transaction([...]). Queries are lazy until awaited, as with Neon, so
  they can be collected into a transaction.
*/
let pg: PGlite | null = null;

class Query implements PromiseLike<unknown[]> {
  constructor(
    readonly text: string,
    readonly params: unknown[],
  ) {}
  then<A = unknown[], B = never>(ok?: ((rows: unknown[]) => A | PromiseLike<A>) | null, fail?: ((error: unknown) => B | PromiseLike<B>) | null) {
    return instance()
      .query(this.text, this.params)
      .then((result) => result.rows as unknown[])
      .then(ok, fail);
  }
}

function instance() {
  if (!pg) throw new Error("Test database not started: call startDb() first.");
  return pg;
}

function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((out, part, i) => out + part + (i < values.length ? `$${i + 1}` : ""), "");
  return new Query(text, values);
}
sql.query = (text: string, params: unknown[] = []) => new Query(text, params);
sql.transaction = (queries: Query[]) =>
  instance().transaction(async (tx) => {
    const out: unknown[][] = [];
    for (const q of queries) out.push((await tx.query(q.text, q.params)).rows as unknown[]);
    return out;
  });

export const testDb = () => sql;

const SCHEMA = readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8");

export async function startDb() {
  if (!pg) {
    pg = new PGlite();
    await pg.exec(SCHEMA);
  }
  return pg;
}

/* Empties every table between tests, keeping the schema. */
export async function resetDb() {
  await instance().exec(`
    truncate payment_items, payments, tab_items, tabs, customers, app_releases, activity_log,
             site_content, reservations, login_attempts, sessions, users, rate_limits restart identity cascade;
    alter sequence tab_number_seq restart;
  `);
}

export async function addUser(email: string, role: "user" | "staff" | "owner", { active = true, passwordHash = "" } = {}) {
  const { rows } = await instance().query<{ id: string; email: string; name: string; role: string }>(
    `insert into users (email, name, password_hash, role, active) values ($1, $2, $3, $4, $5) returning id, email, name, role`,
    [email, email.split("@")[0], passwordHash, role, active],
  );
  return rows[0] as { id: string; email: string; name: string; role: "user" | "staff" | "owner" };
}
