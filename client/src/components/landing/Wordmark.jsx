import { Link } from "react-router-dom";

// "ResumeCraft" set in the serif, finished with a small red ink dot
export default function Wordmark({ className = "text-2xl" }) {
  return (
    <Link
      to="/"
      className={`font-ink-serif font-semibold tracking-tight text-ink [font-variation-settings:'opsz'_72] ${className}`}
    >
      ResumeCraft
      <span className="ml-0.5 inline-block size-[0.28em] rounded-full bg-tomato" aria-hidden="true" />
    </Link>
  );
}
