import RichTextEditor from "./RichTextEditor";

// An editable list of short text lines: add, edit and remove.
// Used for a job's bullet points and for the items of an additional section.
//   rich - each line gets bold / italic / underline / link formatting (bullet points);
//          its toolbar only shows while that line is being edited
export default function ItemsEditor({ label, items, onChange, placeholder, addLabel = "+ Add item", itemName = "item", rich = false }) {
  const updateItem = (index, text) => onChange(items.map((item, i) => (i === index ? text : item)));
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
  const addItem = () => onChange([...items, ""]);

  return (
    <div>
      <p className="label">{label}</p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className={`flex gap-2 ${rich ? "items-start" : "items-center"}`}>
            <span className={`text-slate-400 dark:text-slate-500 ${rich ? "mt-2" : ""}`} aria-hidden="true">
              •
            </span>
            {rich ? (
              <div className="min-w-0 flex-1">
                <RichTextEditor
                  inline
                  toolbar="focus"
                  value={item}
                  onChange={(html) => updateItem(index, html)}
                  placeholder={placeholder}
                  ariaLabel={`${itemName} ${index + 1}`}
                />
              </div>
            ) : (
              <input
                type="text"
                value={item}
                onChange={(event) => updateItem(index, event.target.value)}
                placeholder={placeholder}
                aria-label={`${itemName} ${index + 1}`}
                className="input"
              />
            )}
            <button
              type="button"
              onClick={() => removeItem(index)}
              aria-label={`Remove ${itemName} ${index + 1}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={addItem} className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
        {addLabel}
      </button>
    </div>
  );
}
