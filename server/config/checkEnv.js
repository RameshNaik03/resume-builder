// Checks the settings the server can't work without, before it starts. Without this, a missing
// JWT_SECRET only shows up as a 500 on every login, and a missing CLIENT_URL as the browser
// silently blocking every request (CORS).
const REQUIRED = {
  MONGO_URI: "the MongoDB connection string",
  JWT_SECRET: "a long random string for signing login tokens",
  CLIENT_URL: "the React app's URL, e.g. https://your-app.vercel.app (for CORS and email links)",
};
const EXAMPLE_SECRET = "replace_with_a_long_random_string"; // The value in .env.example

// Returns a list of problems (empty when everything is fine)
export function findEnvProblems(env = process.env) {
  const problems = Object.entries(REQUIRED)
    .filter(([name]) => !env[name]?.trim())
    .map(([name, what]) => `${name} is missing: ${what}`);

  if (env.NODE_ENV === "production" && env.JWT_SECRET) {
    if (env.JWT_SECRET === EXAMPLE_SECRET || env.JWT_SECRET.length < 32) {
      problems.push("JWT_SECRET is too weak for production: use at least 32 random characters (the README shows how to generate one)");
    }
  }
  return problems;
}

// Optional settings worth a warning: the server works without them, but something is off.
// Returns a list of warnings (empty when everything is fine).
export function findEnvWarnings(env = process.env) {
  const warnings = [];
  const cloudinaryKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const missing = cloudinaryKeys.filter((name) => !env[name]?.trim());
  if (env.NODE_ENV === "production" && missing.length) {
    warnings.push(
      `Cloudinary isn't configured (${missing.join(", ")} missing): photo and avatar uploads are off, and deleted photos are only queued (pendingdeletions) until the keys are set`
    );
  }
  return warnings;
}

// Stops the server with a clear message if a required setting is missing, and prints warnings
export default function checkEnv() {
  for (const warning of findEnvWarnings()) console.warn(`Warning: ${warning}`);
  const problems = findEnvProblems();
  if (problems.length === 0) return;
  console.error(`The server can't start. Fix these settings (server/.env, or your host's environment variables):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
