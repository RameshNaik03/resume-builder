import { Check, Loader2 } from "lucide-react";
import { Card } from "./Display";

// A task the server works through in steps (analysing a resume, tailoring it): the steps with
// done / in progress / to come, in a card.
//   title, detail - the heading and one line under it (e.g. the file name)
//   steps         - the step labels; current - the index of the step in progress (steps.length: all done)
//   note          - a short line at the end (how long it usually takes)
export default function StepProgress({ title, detail, steps, current, note, headingLevel = "h1" }) {
  const Heading = headingLevel;
  return (
    <Card className="mx-auto max-w-md" role="status" aria-live="polite">
      <Heading className="text-center type-h3 text-fg">{title}</Heading>
      {detail && <p className="mt-1 truncate text-center type-small text-fg-muted">{detail}</p>}
      <ol className="mt-6 space-y-4">
        {steps.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium ${done ? "bg-success-soft text-success" : active ? "bg-accent-soft text-accent" : "bg-surface-2 text-fg-subtle"}`}
                aria-hidden="true"
              >
                {done ? <Check className="size-4" /> : active ? <Loader2 className="size-4 motion-safe:animate-spin" /> : index + 1}
              </span>
              <span className={`type-body ${done || active ? "text-fg" : "text-fg-subtle"}`}>
                {label}
                <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {note && <p className="mt-6 text-center type-small text-fg-muted">{note}</p>}
    </Card>
  );
}
