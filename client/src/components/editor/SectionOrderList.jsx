import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Eye, EyeOff } from "lucide-react";
import SortableRow from "../ui/SortableRow";
import { MAX_HEADING_LENGTH, SECTIONS } from "../../templates/design";

const LABELS = Object.fromEntries(SECTIONS.map((section) => [section.id, section.label]));

// Drag-and-drop list of resume sections (Design tab): reorder them, show or hide each one,
// and rename its heading in place. Drag with the handle, or focus the handle and use Space + arrow keys.
//   order         - section ids in their current order
//   hidden        - ids of hidden sections
//   headings      - the user's renamed headings ({ projects: "Portfolio" })
//   defaultTitles - the template's own headings (shown until renamed)
export default function SectionOrderList({ order, hidden, headings, defaultTitles, onReorder, onToggle, onRename }) {
  const sensors = useSensors(
    // A small distance before dragging starts, so clicks on the handle aren't drags
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      onReorder(arrayMove(order, order.indexOf(active.id), order.indexOf(over.id)));
    }
  };

  // Screen reader announcements in plain words ("Skills" instead of the id)
  const announcements = {
    onDragStart: ({ active }) => `Picked up ${LABELS[active.id]}.`,
    onDragOver: ({ active, over }) => (over ? `${LABELS[active.id]} is now at position ${order.indexOf(over.id) + 1}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${LABELS[active.id]} dropped at position ${order.indexOf(over.id) + 1}.` : undefined),
    onDragCancel: ({ active }) => `Moving ${LABELS[active.id]} was cancelled.`,
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} accessibility={{ announcements }}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {order.map((id) => (
            <SectionRow
              key={id}
              id={id}
              isHidden={hidden.includes(id)}
              heading={headings[id] ?? ""}
              defaultTitle={defaultTitles[id]}
              onToggle={() => onToggle(id)}
              onRename={(value) => onRename(id, value)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

// One section: its heading (edited in place; cleared, it goes back to the template's heading),
// the section's type when the heading was renamed, and show / hide
function SectionRow({ id, isHidden, heading, defaultTitle, onToggle, onRename }) {
  const label = LABELS[id];
  const shown = heading || defaultTitle || label;
  const [draft, setDraft] = useState(null); // The text while editing (it may be empty)

  return (
    <SortableRow id={id} label={label}>
      <div className={`min-w-0 flex-1 ${isHidden ? "opacity-50" : ""}`}>
        {id === "additional" ? (
          <div className="px-2 py-1">
            <p className="type-label text-fg">{label}</p>
            <p className="type-small text-fg-muted">Each one keeps its own heading</p>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={draft ?? shown}
              onFocus={() => setDraft(shown)}
              onBlur={() => setDraft(null)}
              onChange={(event) => {
                setDraft(event.target.value);
                const value = event.target.value.trim();
                onRename(value === (defaultTitle || label) ? "" : event.target.value);
              }}
              maxLength={MAX_HEADING_LENGTH}
              aria-label={`Heading for ${label}`}
              title="Click to rename this heading"
              className="h-8 w-full rounded-md border border-transparent bg-transparent px-2 type-label text-fg transition-colors outline-none hover:border-line focus:border-accent focus:bg-surface focus:ring-3 focus:ring-accent/15"
            />
            {heading && heading !== label && <p className="px-2 type-small text-fg-muted">{label} section</p>}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={!isHidden}
        aria-label={isHidden ? `Show ${label}` : `Hide ${label}`}
        title={isHidden ? "Hidden. Click to show" : "Shown. Click to hide"}
        className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-accent ${isHidden ? "text-fg-subtle hover:bg-surface-2" : "text-accent hover:bg-accent-soft"}`}
      >
        {isHidden ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </SortableRow>
  );
}
