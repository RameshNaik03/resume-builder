// A rough strength hint for a new password (Settings > Password). Only a hint: the server's rule
// is the same as at sign-up (at least 6 characters).
// Returns { score: 0-4, label, tip }:
//   0 "Too short" (under 6 characters, or a very common password), 1 "Weak", 2 "Fair",
//   3 "Good", 4 "Strong"

export const MIN_PASSWORD_LENGTH = 6;

const COMMON = new Set(["password", "password1", "123456", "1234567", "12345678", "123456789", "qwerty", "qwertz", "abc123", "111111", "letmein", "secret", "secret123", "welcome", "iloveyou", "admin", "passwort"]);

export default function passwordStrength(password = "") {
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 0, label: "Too short", tip: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) return { score: 0, label: "Too common", tip: "This password is easy to guess. Choose something less obvious." };

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  let score = 1;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (kinds >= 3) score++;
  score = Math.min(4, score);

  const tips = {
    1: "Make it longer: 10 or more characters, or a few unrelated words.",
    2: "Longer is better: try 14 characters, or mix in numbers and symbols.",
    3: "Good. A few more characters make it even harder to guess.",
    4: "Strong password.",
  };
  return { score, label: ["Too short", "Weak", "Fair", "Good", "Strong"][score], tip: tips[score] };
}
