// Production readiness: the startup check for required settings, the health check, and the
// response headers.
import { test } from "node:test";
import { findEnvProblems, findEnvWarnings } from "../config/checkEnv.js";
import { checker, startApi } from "./helpers/api.js";

const GOOD = { MONGO_URI: "mongodb://db/resume", JWT_SECRET: "a".repeat(40), CLIENT_URL: "https://app.example" };

test("required settings are checked at startup", async (t) => {
  const check = checker(t);
  await check("all set -> no problems", findEnvProblems(GOOD).length === 0);
  const missing = findEnvProblems({});
  await check("nothing set -> MONGO_URI, JWT_SECRET and CLIENT_URL reported", ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"].every((name) => missing.some((p) => p.startsWith(name))), missing);
  await check("an empty value counts as missing", findEnvProblems({ ...GOOD, CLIENT_URL: "  " }).some((p) => p.startsWith("CLIENT_URL")));
  await check("a short secret is fine in development", findEnvProblems({ ...GOOD, JWT_SECRET: "dev" }).length === 0);
  await check("but not in production", findEnvProblems({ ...GOOD, NODE_ENV: "production", JWT_SECRET: "dev" }).some((p) => p.includes("too weak")));
  await check("nor the example value from .env.example", findEnvProblems({ ...GOOD, NODE_ENV: "production", JWT_SECRET: "replace_with_a_long_random_string" }).some((p) => p.includes("too weak")));
  await check("a long secret in production -> fine", findEnvProblems({ ...GOOD, NODE_ENV: "production" }).length === 0);

  const cloudinary = { CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "key", CLOUDINARY_API_SECRET: "secret" };
  const warnings = findEnvWarnings({ ...GOOD, NODE_ENV: "production", CLOUDINARY_CLOUD_NAME: "demo" });
  await check("production without Cloudinary keys -> a warning naming the missing ones", warnings.length === 1 && warnings[0].includes("CLOUDINARY_API_KEY") && !warnings[0].includes("CLOUDINARY_CLOUD_NAME"), warnings);
  await check("  but it doesn't stop the server", findEnvProblems({ ...GOOD, NODE_ENV: "production" }).length === 0);
  await check("production with the keys -> no warning", findEnvWarnings({ ...GOOD, ...cloudinary, NODE_ENV: "production" }).length === 0);
  await check("development without the keys -> no warning", findEnvWarnings(GOOD).length === 0);
});

test("health check and headers", async (t) => {
  const base = await startApi(t, "production");
  const check = checker(t);
  const res = await fetch(`${base}/health`);
  const body = await res.json();
  await check("health -> 200 with the database connected", res.status === 200 && body.status === "ok" && body.database === "connected", body);
  await check("no X-Powered-By header", res.headers.get("x-powered-by") === null);
});
