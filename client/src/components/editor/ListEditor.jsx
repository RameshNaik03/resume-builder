import { useState } from "react";
import createId from "../../utils/createId";

// Small icon button used in each entry's header
function IconButton({ label, onClick, disabled, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-lg text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

// One entry: a header (title + move/remove buttons) and collapsible fields
function EntryCard({ title, defaultOpen, isFirst, isLast, onMoveUp, onMoveDown, onRemove, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50">
      <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <svg
            className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="truncate text-sm font-medium text-slate-800">{title}</span>
        </button>

        <IconButton label="Move up" onClick={onMoveUp} disabled={isFirst}>
          <path d="m18 15-6-6-6 6" />
        </IconButton>
        <IconButton label="Move down" onClick={onMoveDown} disabled={isLast}>
          <path d="m6 9 6 6 6-6" />
        </IconButton>
        <IconButton label="Remove" onClick={onRemove} danger>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </IconButton>
      </div>

      {open && <div className="space-y-4 border-t border-slate-200 p-4">{children}</div>}
    </div>
  );
}

// Reusable add / remove / reorder list used by Experience, Education and Projects.
//   items        - the array from the resume
//   onChange     - receives the new array
//   createItem   - returns a new, empty entry
//   getTitle     - returns the text shown in an entry's header
//   renderFields - (item, update) => the inputs for one entry; call update({ field: value })
export default function ListEditor({ items, onChange, createItem, getTitle, renderFields, addLabel, emptyText }) {
  const [lastAddedId, setLastAddedId] = useState(null); // New entries start expanded

  const addItem = () => {
    const newItem = { _id: createId(), ...createItem() };
    setLastAddedId(newItem._id);
    onChange([...items, newItem]);
  };

  const updateItem = (index, changes) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  // direction: -1 = up, +1 = down
  const moveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;

    const reordered = [...items];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]; // Swap
    onChange(reordered);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-slate-400">{emptyText}</p>}

      {items.map((item, index) => (
        <EntryCard
          key={item._id ?? index}
          title={getTitle(item)}
          defaultOpen={item._id === lastAddedId || items.length === 1}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          onMoveUp={() => moveItem(index, -1)}
          onMoveDown={() => moveItem(index, 1)}
          onRemove={() => removeItem(index)}
        >
          {renderFields(item, (changes) => updateItem(index, changes))}
        </EntryCard>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {addLabel}
      </button>
    </div>
  );
}
