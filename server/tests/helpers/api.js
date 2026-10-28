import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { connectTestDb } from "./db.js";

// Shared helpers for the API test suites.

// Keys the tests must never use for real (they could cost money or send email). Tests that
// need one (e.g. a fake Claude API) set it themselves.
const REAL_SERVICE_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_URL",
  "RESEND_API_KEY",
];

// Starts the real app (app.js) on a free port with a throwaway database.
// Everything is stopped and the database dropped when the test `t` ends.
// Returns the API's base URL, e.g. "http://localhost:51234/api".
export async function startApi(t, name) {
  for (const key of REAL_SERVICE_KEYS) delete process.env[key];
  process.env.JWT_SECRET = "test-secret";

  const db = await connectTestDb(name);
  const { default: app } = await import("../../app.js");
  const server = app.listen(0);
  await once(server, "listening");

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await db.drop();
  });
  return `http://localhost:${server.address().port}/api`;
}

// check(label, condition, details) - one named result per check, reported as a subtest of `t`.
// Await it, so results appear in order: `await check("no token -> 401", r.status === 401, r.status)`
export const checker = (t) => (label, condition, details = "") =>
  t.test(label, () => assert.ok(condition, `${label}${details === "" ? "" : ` (got: ${typeof details === "string" ? details : JSON.stringify(details)})`}`));

// Registers a user and returns its token
export async function register(base, email, name = "Test User") {
  const res = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "secret123" }),
  });
  return (await res.json()).token;
}

// ---------- Fixtures ----------

export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const FIXTURE_DIRS = ["fixtures/ats", "fixtures/import", "fixtures"].map((dir) => fileURLToPath(new URL(`../${dir}/`, import.meta.url)));

// Full path of a fixture file (looks in fixtures/ats, fixtures/import and fixtures)
export function fixture(name) {
  const found = FIXTURE_DIRS.map((dir) => dir + name).find((file) => fs.existsSync(file));
  if (!found) throw new Error(`Fixture not found: ${name}`);
  return found;
}

export const readFixture = (name, encoding) => fs.readFileSync(fixture(name), encoding);
