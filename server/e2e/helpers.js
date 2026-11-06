import { execFileSync, execSync, spawn } from "node:child_process";
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

// The API and Vite processes this run started and hasn't stopped yet (stopped on exit too)
const liveChildren = new Set();

// Starts a long-running command; its output is kept for error messages
function start(command, args, options) {
  const child = spawn(command, args, { ...options, shell: process.platform === "win32", detached: process.platform !== "win32" });
  liveChildren.add(child);
  cleanUpOnExit();
  child.output = "";
  child.stdout.on("data", (chunk) => (child.output += chunk));
  child.stderr.on("data", (chunk) => (child.output += chunk));
  return child;
}

// Stops a process and everything it started (Vite runs under npx and a shell)
function stop(child) {
  liveChildren.delete(child);
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // Already gone
  }
}

// ---------- The browser's processes ----------
// Each run gives its browser its own profile folder, so every process that browser starts (the
// main one, renderers, GPU, crashpad...) has that folder on its command line. Cleanup stops
// exactly those, and nothing else: not your own browser, nor another run's. It runs after
// browser.close() (which can hang, fail, or miss processes when Edge's launcher hands over to
// another process), when a test fails, and when the run exits or is interrupted.

// The ids of the browser processes whose command line mentions `profileDir`
export function browserProcessIds(profileDir) {
  try {
    if (process.platform === "win32") {
      const script = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${profileDir.replace(/'/g, "''")}') } | ForEach-Object { $_.ProcessId }`;
      const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 30000 });
      return output.split(/\s+/).filter(Boolean).map(Number);
    }
    return execFileSync("pgrep", ["-f", profileDir], { encoding: "utf8" }).split(/\s+/).filter(Boolean).map(Number);
  } catch {
    return []; // pgrep exits with 1 when nothing matched
  }
}

// Stops the processes whose command line mentions `profileDir` (synchronous, so it also works
// in an "exit" handler), then deletes the folder
export function killBrowserProcesses(profileDir) {
  for (const pid of browserProcessIds(profileDir)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone (stopping the main process often ends its helpers too)
    }
  }
  // Windows may hold the files for a moment after the processes stop
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

// browser.close(), but give up after `ms` (the processes are stopped by profile folder anyway)
const closeWithin = (browser, ms) => Promise.race([browser.close().catch(() => {}), sleep(ms)]);

// Profile folders of browsers this run started and hasn't cleaned up yet
const liveProfiles = new Set();
let exitHandlersAdded = false;
function cleanUpOnExit() {
  if (exitHandlersAdded) return;
  exitHandlersAdded = true;
  const cleanAll = () => {
    for (const dir of liveProfiles) killBrowserProcesses(dir);
    liveProfiles.clear();
    for (const child of liveChildren) stop(child);
  };
  process.on("exit", cleanAll);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.once(signal, () => {
      cleanAll();
      process.exit(130);
    });
  }
}

// Launches the headless browser with its own profile folder; `register(cleanup)` is called
// before launching, so the processes are stopped even when the launch itself fails
export async function launchBrowser(register) {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "resume-builder-e2e-profile-"));
  liveProfiles.add(profileDir);
  cleanUpOnExit();
  let browser;
  register(async () => {
    if (browser) await closeWithin(browser, 5000);
    killBrowserProcesses(profileDir);
    liveProfiles.delete(profileDir);
  });
  // CI runners (Linux) don't allow Chrome's sandbox, so it's turned off there (CI is set by GitHub Actions)
  const args = ["--no-first-run", "--disable-extensions", ...(process.env.CI ? ["--no-sandbox"] : [])];
  browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, userDataDir: profileDir, args });
  return browser;
}

// Starts the API, Vite and a browser for the test `t`. Returns { browser, register, api(...) }.
// Everything is stopped in t.after, which also runs when a test fails.
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

  let closeBrowser = async () => {};
  t.after(async () => {
    await closeBrowser();
    stop(vite);
    stop(apiProcess);
    await db.drop();
  });

  await waitForUrl(`${API}/health`, "The API", apiProcess);
  await waitForUrl(APP, "Vite", vite);
  const browser = await launchBrowser((cleanup) => (closeBrowser = cleanup));

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
