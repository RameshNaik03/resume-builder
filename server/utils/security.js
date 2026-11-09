import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// Helpers shared by the auth and account routes.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

// Emailed tokens are stored hashed, so a leaked database can't be used with them
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// A new random token for an emailed link
export const randomToken = () => crypto.randomBytes(32).toString("hex");

// Makes user-typed text (like a name) safe to put inside an HTML email
export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// A JWT with the user's id and token version (raising the version logs out every device).
// Expires in 7 days.
export const generateToken = (user) => jwt.sign({ id: user._id, tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });

// The password rules (the same at registration, reset and change): what's wrong, or null
export const passwordProblem = (password) => {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  return null;
};

// "nina@example.com" -> "n***@example.com" (shown to the old address when the email changes)
export const maskEmail = (email) => {
  const [local, domain] = String(email).split("@");
  return `${local.slice(0, 1)}***@${domain}`;
};
