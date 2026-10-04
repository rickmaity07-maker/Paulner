/*
  Publishes a new version of the Deckel tablet app. Every tablet sees it within
  30 minutes (or right away on start) and offers to install it.

    npm run app:release -- --notes "Neu: …" [--notes-en "New: …"] [--name 1.2.0] [--mandatory]
    npm run app:release -- --dry-run      builds and checks, uploads nothing

  Steps: picks the next version number, builds the signed release APK
  (android/, key from ~/.android-paulaner), uploads it to Vercel Blob and
  records it in the database. Reads DATABASE_URL and BLOB_READ_WRITE_TOKEN
  from .env.local; --env-file=.env.test.local publishes to the test database.
*/
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = path.resolve(import.meta.dirname, "..");
const android = path.join(root, "android");
const fail = (message) => {
  console.error(`✘ ${message}`);
  process.exit(1);
};

if (!process.env.DATABASE_URL) fail("DATABASE_URL is missing (run with --env-file=.env.local).");
if (!flag("dry-run") && !process.env.BLOB_READ_WRITE_TOKEN) fail("BLOB_READ_WRITE_TOKEN is missing.");
if (!existsSync(path.join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".android-paulaner", "keystore.properties")))
  fail("Release key not found in ~/.android-paulaner. Without it the tablets can't install updates.");

const notes = option("notes") ?? "";
if (!notes && !flag("dry-run")) fail('Describe what changed: --notes "…"');
const sql = neon(process.env.DATABASE_URL);

// Next version: build number +1, name bumps the last part unless given.
const [last] = await sql`select version_code, version_name from app_releases order by version_code desc limit 1`;
const versionCode = (last?.version_code ?? 0) + 1;
const versionName =
  option("name") ?? (last ? last.version_name.replace(/(\d+)$/, (n) => String(Number(n) + 1)) : "1.0.0");
if (!/^\d+\.\d+\.\d+$/.test(versionName)) fail(`Version name must look like 1.2.0, got ${versionName}`);
console.log(`→ Building ${versionName} (build ${versionCode}) …`);

// Full path: Windows may not run programs from the current folder.
const gradlew = path.join(android, process.platform === "win32" ? "gradlew.bat" : "gradlew");
execSync(`"${gradlew}" assembleRelease -PversionCode=${versionCode} -PversionName=${versionName} --console=plain -q`, {
  cwd: android,
  stdio: "inherit",
});

const apk = path.join(android, "app", "build", "outputs", "apk", "release", "app-release.apk");
const size = statSync(apk).size;
const sha256 = createHash("sha256").update(readFileSync(apk)).digest("hex");
console.log(`✔ Built ${(size / 1024 / 1024).toFixed(1)} MB, SHA-256 ${sha256}`);

if (flag("dry-run")) {
  console.log("Dry run: nothing uploaded or published.");
  process.exit(0);
}

console.log("→ Uploading …");
const blob = await put(`deckel/deckel-${versionName}-${versionCode}.apk`, createReadStream(apk), {
  access: "public",
  contentType: "application/vnd.android.package-archive",
  addRandomSuffix: true,
  multipart: true,
});

await sql`
  insert into app_releases (version_code, version_name, url, sha256, size_bytes, notes, notes_en, mandatory)
  values (${versionCode}, ${versionName}, ${blob.url}, ${sha256}, ${size}, ${notes}, ${option("notes-en") ?? ""}, ${flag("mandatory")})
`;
console.log(`✔ Published ${versionName} (build ${versionCode})${flag("mandatory") ? " as a mandatory update" : ""}`);
console.log(`  ${blob.url}`);
