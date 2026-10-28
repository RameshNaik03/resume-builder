import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

// A throwaway MongoDB database for one test run, dropped afterwards.
// MongoDB comes from TEST_MONGO_URI (default: the local Docker database). If nothing answers
// there, it's started with `docker compose up -d --wait`, the same as `npm run db:up`.

export const MONGO_BASE = (process.env.TEST_MONGO_URI ?? "mongodb://127.0.0.1:27017").replace(/\/$/, "");
const SERVER_DIR = fileURLToPath(new URL("../..", import.meta.url));

//   name - a short label for the database name, e.g. "resume"
// Returns { uri, drop }; the mongoose connection is open when it returns
export async function connectTestDb(name) {
  const uri = `${MONGO_BASE}/test_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
  } catch {
    console.log(`No MongoDB at ${MONGO_BASE}; starting it with docker compose...`);
    try {
      execSync("docker compose up -d --wait", { cwd: SERVER_DIR, stdio: "inherit" });
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    } catch {
      throw new Error(`Couldn't reach MongoDB at ${MONGO_BASE}. Start it (npm run db:up in server/) or set TEST_MONGO_URI.`);
    }
  }
  return {
    uri,
    drop: async () => {
      if (mongoose.connection.readyState !== 1) return;
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}
