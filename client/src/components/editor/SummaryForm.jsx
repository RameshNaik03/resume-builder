import { useId } from "react";
import { toPlainText } from "../../utils/richText";
import RichTextEditor from "./RichTextEditor";

const RECOMMENDED_LENGTH = 400; // A guideline, not a hard limit

// value is rich text (HTML), or plain text from older resumes
export default function SummaryForm({ value, onChange }) {
  const labelId = useId();
  const length = toPlainText(value).trim().length; // Count the words you see, not the HTML

  return (
    <div>
      <p id={labelId} className="label">
        Professional summary
      </p>
      <RichTextEditor
        value={value}
        onChange={onChange}
        ariaLabel="Professional summary"
        placeholder="2–4 sentences about who you are, what you're good at, and what you're looking for."
        minHeight="7rem"
      />
      <p
        className={`mt-1.5 text-right text-xs ${length > RECOMMENDED_LENGTH ? "text-warning" : "text-fg-subtle"}`}
      >
        {length} / {RECOMMENDED_LENGTH} characters recommended
      </p>
    </div>
  );
}
