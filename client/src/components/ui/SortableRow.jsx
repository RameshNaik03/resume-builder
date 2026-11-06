import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// One row of a drag-to-reorder list (inside dnd-kit's SortableContext): the drag handle, then
// the row's content. Drag with the handle, or focus it and use Space + the arrow keys.
//   id     - the sortable id; label - what the handle moves ("Move Skills")
//   ...props go on the <li> (e.g. data-skill)
export default function SortableRow({ id, label, children, ...props }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-surface py-1.5 pr-1.5 pl-1 ${isDragging ? "relative z-10 border-accent shadow-raised" : "border-line"}`}
      {...props}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Move ${label}`}
        className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      {children}
    </li>
  );
}
