// Creates a random 24-character hex id, the same format MongoDB uses.
// New list entries get one right away so React has a stable key for them,
// and the server keeps it as the entry's _id when it saves.
export default function createId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
