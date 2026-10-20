// Light/dark theme store.
// The theme is a "dark" class on <html> (Tailwind's class strategy, see index.css).
// A choice made with the toggle is saved in localStorage; with no saved choice we
// follow the system setting, including when it changes while the app is open.
// index.html applies the theme before React loads, so the first paint is correct.

const STORAGE_KEY = "theme"; // Also used by the inline script in index.html
const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // Storage can be blocked (e.g. some private windows)
  }
};

const apply = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  listeners.forEach((listener) => listener());
};

export const getTheme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export const setTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Still switch for this visit, it just won't be remembered
  }
  apply(theme);
};

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

systemQuery.addEventListener("change", (event) => {
  if (!readSaved()) apply(event.matches ? "dark" : "light");
});
