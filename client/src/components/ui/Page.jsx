import { pageClass } from "./pageLayout";

// A page's content area inside the AppShell: width "default" (72rem) or "narrow" (28rem).
// Pages whose root is already a <div> can use pageClass() from ./pageLayout.js on it instead.
export default function Page({ width = "default", className = "", children }) {
  return <div className={pageClass(width, className)}>{children}</div>;
}
