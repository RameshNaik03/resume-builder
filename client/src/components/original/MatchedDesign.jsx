import { Check } from "lucide-react";
import ResumeThumbnail from "../ui/ResumeThumbnail";
import Button from "../ui/Button";
import { Alert } from "../ui/Display";
import OriginalDocument from "./OriginalDocument";
import { useMatchedDesign } from "./applyTemplate";

const PAGE_WIDTH = 300;

// "Edit with a matching template": the original beside the closest template we have (styled
// like it), what was matched, and the choice: use it, or pick another template.
//   onUse({ templateId, design }) / onChooseOther() - busy: while the choice is being saved
export default function MatchedDesign({ resume, onUse, onChooseOther, busy = false }) {
  const match = useMatchedDesign(resume);
  return (
    <div className="space-y-5" data-testid="matched-design">
      <p className="type-small text-fg-muted">Editing rebuilds your resume in one of our templates. We picked the one closest to your file and styled it to match. Your original stays as it is.</p>
      {match.fallback && <Alert tone="info">We couldn't read your file's design, so we picked a clean single-column template. You can change it in the editor.</Alert>}

      <div className="grid justify-center gap-6 sm:grid-cols-2">
        <figure className="mx-auto">
          <figcaption className="mb-2 type-label text-fg">Your original</figcaption>
          <div className="overflow-hidden" style={{ width: PAGE_WIDTH, height: PAGE_WIDTH * (297 / 210) }}>
            <OriginalDocument resume={resume} pages="first" width={PAGE_WIDTH} />
          </div>
        </figure>
        <figure className="mx-auto">
          <figcaption className="mb-2 type-label text-fg">
            Matched: <span data-testid="matched-template">{match.templateName}</span>
          </figcaption>
          <ResumeThumbnail resume={{ ...resume, template: match.templateId, design: match.design }} templateId={match.templateId} width={PAGE_WIDTH} />
        </figure>
      </div>

      {match.notes.length > 0 && (
        <div>
          <h3 className="type-label text-fg">What we matched</h3>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2" data-testid="match-notes">
            {match.notes.map((note) => (
              <li key={note} className="flex gap-2 type-small text-fg-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button onClick={onChooseOther} disabled={busy}>
          Choose a different template
        </Button>
        <Button variant="primary" onClick={() => onUse(match)} loading={busy} data-autofocus>
          Use this
        </Button>
      </div>
    </div>
  );
}
