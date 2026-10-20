import { useEffect } from "react";

const APP_NAME = "ResumeCraft";

// Sets the browser tab title, e.g. usePageTitle("Dashboard") -> "Dashboard · ResumeCraft"
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
