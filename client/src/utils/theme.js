// Light/dark theme store.
// The theme is a "dark" class on <html> (Tailwind's class strategy, see index.css).
// The choice is "light", "dark" or "system" (follow the device, including when it changes while
// the app is open). "light" and "dark" are saved in localStorage; "system" is no saved value.
// Logged-in users' choice is also kept in their account (Settings > Preferences), and applied
// from there when they log in (see AuthContext).
// index.html applies the theme before React loads, so the first paint is correct.

const STORAGE_KEY = "theme"; // Also used by the inline script in index.html
const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();

const readSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null; // Storage can be blocked (e.g. some private windows)
  }
};

const apply = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  listeners.forEach((listener) => listener());
};

// The theme in use: "light" or "dark"
export const getTheme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

// The choice: "light", "dark" or "system"
export const getThemeChoice = () => readSaved() ?? "system";

// choice: "light", "dark" or "system"
export const setTheme = (choice) => {
  try {
    if (choice === "light" || choice === "dark") localStorage.setItem(STORAGE_KEY, choice);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Still switch for this visit, it just won't be remembered
  }
  apply(choice === "light" || choice === "dark" ? choice : systemQuery.matches ? "dark" : "light");
};

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

systemQuery.addEventListener("change", (event) => {
  if (!readSaved()) apply(event.matches ? "dark" : "light");
});
