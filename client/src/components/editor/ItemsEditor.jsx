// An editable list of short text lines: add, edit and remove.
// Used for a job's bullet points and for the items of an additional section.
export default function ItemsEditor({ label, items, onChange, placeholder, addLabel = "+ Add item", itemName = "item" }) {
  const updateItem = (index, text) => onChange(items.map((item, i) => (i === index ? text : item)));
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
  const addItem = () => onChange([...items, ""]);

  return (
    <div>
      <p className="label">{label}</p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="text-slate-400" aria-hidden="true">•</span>
            <input
              type="text"
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              aria-label={`${itemName} ${index + 1}`}
              className="input"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              aria-label={`Remove ${itemName} ${index + 1}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={addItem} className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
        {addLabel}
      </button>
    </div>
  );
}
