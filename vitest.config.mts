import { defineConfig } from "vitest/config";

const root = import.meta.dirname;
const alias = {
  "@/": `${root}/`,
  // Next's guard against importing server code in the browser; tests run on the server side anyway.
  "server-only": `${root}/tests/support/empty.ts`,
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        // Real SQL against db/schema.sql in an in-memory Postgres (PGlite). Never touches Neon.
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/support/setup-db.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
