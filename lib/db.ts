import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/* The public site still renders from its built-in defaults when no database is connected. */
export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

/* Tagged-template query function: values are always sent as parameters, never spliced in. */
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
