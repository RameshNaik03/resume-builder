import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from "lucide-react";
import createId from "../../utils/createId";
import Button from "../ui/Button";

// One entry: a header (title + move/remove buttons) and collapsible fields
function EntryCard({ title, defaultOpen, isFirst, isLast, onMoveUp, onMoveDown, onRemove, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-line bg-surface-2/50">
      <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-3">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left focus-visible:outline-2 focus-visible:outline-accent">
          <ChevronRight className={`size-4 shrink-0 text-fg-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
          <span className="truncate type-label text-fg">{title}</span>
        </button>

        <Button variant="ghost" size="sm" iconOnly icon={ArrowUp} onClick={onMoveUp} disabled={isFirst} aria-label="Move up" title="Move up" />
        <Button variant="ghost" size="sm" iconOnly icon={ArrowDown} onClick={onMoveDown} disabled={isLast} aria-label="Move down" title="Move down" />
        <Button variant="ghostDanger" size="sm" iconOnly icon={Trash2} onClick={onRemove} aria-label="Remove" title="Remove" />
      </div>

      {open && <div className="space-y-4 border-t border-line p-4">{children}</div>}
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
      {items.length === 0 && <p className="type-small text-fg-muted">{emptyText}</p>}

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
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-2.5 type-label text-fg-muted transition-colors hover:border-fg-subtle hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Plus className="size-4" aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}
