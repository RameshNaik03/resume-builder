import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { connectTestDb } from "../tests/helpers/db.js";

// Shared setup for the browser tests: the real API (server.js), the React app (Vite) and a
// headless Edge or Chrome, against a throwaway database. Everything is stopped and the
// database dropped when the test ends.
//
// Settings (environment variables):
//   API_PORT / CLIENT_PORT - default 5055 / 5174 (your dev servers on 5000/5173 can keep running)
//   BROWSER_PATH           - Edge or Chrome executable, if it isn't found automatically
//   TEST_MONGO_URI         - see tests/helpers/db.js

const SERVER_DIR = fileURLToPath(new URL("..", import.meta.url));
const CLIENT_DIR = fileURLToPath(new URL("../../client", import.meta.url));
export const API_PORT = Number(process.env.API_PORT ?? 5055);
export const CLIENT_PORT = Number(process.env.CLIENT_PORT ?? 5174);
export const API = `http://localhost:${API_PORT}/api`;
export const APP = `http://localhost:${CLIENT_PORT}`;
// Screenshots, PDFs and extracted text from the last run, for when a check fails
export const OUT_DIR = path.join(os.tmpdir(), "resume-builder-e2e");

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
  const candidates = [
    process.env.BROWSER_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("No Edge or Chrome found. Set BROWSER_PATH to a Chromium-based browser.");
  return found;
}

async function portInUse(port) {
  try {
    await fetch(`http://localhost:${port}`);
    return true;
  } catch {
    return false;
  }
}

async function waitForUrl(url, label, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`${label} exited (code ${child.exitCode}):\n${child.output}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not up yet
    }
    await sleep(500);
  }
  throw new Error(`${label} didn't start at ${url}:\n${child.output}`);
}

// Starts a long-running command; its output is kept for error messages
function start(command, args, options) {
  const child = spawn(command, args, { ...options, shell: process.platform === "win32", detached: process.platform !== "win32" });
  child.output = "";
  child.stdout.on("data", (chunk) => (child.output += chunk));
  child.stderr.on("data", (chunk) => (child.output += chunk));
  return child;
}

// Stops a process and everything it started (Vite runs under npx and a shell)
function stop(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // Already gone
  }
}

// Starts the API, Vite and a browser for the test `t`. Returns { browser, register, api(...) }.
export async function startStack(t, name) {
  for (const port of [API_PORT, CLIENT_PORT]) {
    if (await portInUse(port)) throw new Error(`Port ${port} is already in use. Stop what's running there, or set API_PORT / CLIENT_PORT.`);
  }
  const db = await connectTestDb(name);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Environment variables already set win over server/.env (dotenv doesn't override them):
  // the test API uses the throwaway database and no real AI, photo or email keys
  const apiProcess = start("node", ["server.js"], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      MONGO_URI: db.uri,
      CLIENT_URL: APP,
      JWT_SECRET: "e2e-test-secret",
      ANTHROPIC_API_KEY: "",
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
      CLOUDINARY_URL: "",
      RESEND_API_KEY: "",
    },
  });
  const vite = start("npx", ["vite", "--port", String(CLIENT_PORT), "--strictPort"], {
    cwd: CLIENT_DIR,
    env: { ...process.env, VITE_API_URL: API },
  });

  let browser;
  t.after(async () => {
    await browser?.close().catch(() => {});
    stop(vite);
    stop(apiProcess);
    await db.drop();
  });

  await waitForUrl(`${API}/health`, "The API", apiProcess);
  await waitForUrl(APP, "Vite", vite);
  // CI runners (Linux) don't allow Chrome's sandbox, so it's turned off there (CI is set by GitHub Actions)
  const args = ["--no-first-run", "--disable-extensions", ...(process.env.CI ? ["--no-sandbox"] : [])];
  browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args });

  return {
    browser,
    // Calls the API: api("POST", "/resumes", token, body) -> { status, body }
    api: async (method, url, token, body) => {
      const res = await fetch(`${API}${url}`, {
        method,
        headers: { ...(body !== undefined && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    },
    // A new user's token
    register: async (label = "user") => {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test User", email: `${label}${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`, password: "secret123" }),
      });
      return (await res.json()).token;
    },
  };
}

// Logs the browser page in with a token (or out with null), starting on the login page
export async function logIn(page, token) {
  await page.goto(`${APP}/login`, { waitUntil: "networkidle0" });
  await page.evaluate((value) => (value ? localStorage.setItem("token", value) : localStorage.clear()), token);
}
