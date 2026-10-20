import { useSyncExternalStore } from "react";

const query = window.matchMedia("(prefers-reduced-motion: reduce)");
const subscribe = (onChange) => {
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

// True when the user has turned on "reduce motion" in their system settings.
// Updates live if they change it while the page is open.
export default function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => query.matches);
}
