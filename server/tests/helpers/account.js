// Helpers for the account settings suites.

// A JSON request: returns { status, body }
export const caller = (base) => async (method, url, token, body) => {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  if (token) options.headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + url, options);
  const type = res.headers.get("content-type") ?? "";
  return { status: res.status, headers: res.headers, body: type.includes("json") ? await res.json() : Buffer.from(await res.arrayBuffer()) };
};

// Logs in and returns the token (each login is a separate "session")
export async function login(base, email, password = "secret123") {
  const res = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  return (await res.json()).token;
}

// Without RESEND_API_KEY the server prints each email instead of sending it (see
// utils/sendEmail.js). This collects them: [{ to, subject, text }]. Restored when `t` ends.
export function captureEmails(t) {
  const emails = [];
  const realLog = console.log;
  console.log = (...args) => {
    const output = args.join(" ");
    const match = output.match(/--- Email \(RESEND_API_KEY not set, not sent\) ---\nTo: (.*)\nSubject: (.*)\n\n([\s\S]*)\n---/);
    if (match) emails.push({ to: match[1], subject: match[2], text: match[3] });
    else realLog(...args);
  };
  t.after(() => {
    console.log = realLog;
  });
  return emails;
}

// The token at the end of a link in an email ("/confirm-email/<token>")
export const tokenFrom = (email, path) => email?.text.match(new RegExp(`/${path}/([a-f0-9]{64})`))?.[1];

// Stand-ins for Cloudinary's upload and destroy (the same module instance the server uses), so
// no test contacts Cloudinary. Returns the recorded calls: ["upload", publicId, options] and
// ["destroy", publicId]. Fake keys are set so the server thinks Cloudinary is configured.
export function fakeCloudinary(cloudinary) {
  const calls = [];
  const state = { failUpload: false };
  let version = 0;
  cloudinary.uploader.upload = async (source, options) => {
    calls.push(["upload", options.public_id, options]);
    if (state.failUpload) throw new Error("boom");
    version += 1;
    return { secure_url: `https://res.cloudinary.com/demo/image/upload/v${version}/${options.public_id}.jpg`, public_id: options.public_id };
  };
  cloudinary.uploader.destroy = async (id) => {
    calls.push(["destroy", id]);
    return { result: "ok" };
  };
  return { calls, state };
}

export const useFakeCloudinaryKeys = () => {
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
};

// Tiny files with real image signatures (the server checks the first bytes)
export const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]);
