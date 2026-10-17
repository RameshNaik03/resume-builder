const RECOMMENDED_LENGTH = 400; // A guideline, not a hard limit

export default function SummaryForm({ value, onChange }) {
  const length = value.length;

  return (
    <div>
      <label htmlFor="summary" className="label">
        Professional summary
      </label>
      <textarea
        id="summary"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="2–4 sentences about who you are, what you're good at, and what you're looking for."
        className="input resize-y"
      />
      <p className={`mt-1.5 text-right text-xs ${length > RECOMMENDED_LENGTH ? "text-amber-600" : "text-slate-400"}`}>
        {length} / {RECOMMENDED_LENGTH} characters recommended
      </p>
    </div>
  );
}
