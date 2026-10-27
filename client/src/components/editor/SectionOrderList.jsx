import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { MAX_HEADING_LENGTH, SECTIONS } from "../../templates/design";

const LABELS = Object.fromEntries(SECTIONS.map((section) => [section.id, section.label]));

// Drag-and-drop list of resume sections (Design tab): reorder them, show or hide each one,
// and rename its heading. Drag with the handle, or focus the handle and use Space + arrow keys.
//   order         - section ids in their current order
//   hidden        - ids of hidden sections
//   headings      - the user's renamed headings ({ projects: "Portfolio" })
//   defaultTitles - the template's own headings (shown as placeholders)
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

function SectionRow({ id, isHidden, heading, defaultTitle, onToggle, onRename }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const label = LABELS[id];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 ${
        isDragging ? "relative z-10 shadow-lg ring-2 ring-indigo-500" : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Move ${label}`}
        className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <div className={`min-w-0 flex-1 ${isHidden ? "opacity-50" : ""}`}>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {id === "additional" ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Each one keeps its own heading</p>
        ) : (
          <input
            type="text"
            value={heading}
            onChange={(event) => onRename(event.target.value)}
            placeholder={defaultTitle}
            maxLength={MAX_HEADING_LENGTH}
            aria-label={`Heading for ${label}`}
            className="mt-1 w-full rounded-md border border-slate-200 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={!isHidden}
        aria-label={isHidden ? `Show ${label}` : `Hide ${label}`}
        title={isHidden ? "Hidden. Click to show" : "Shown. Click to hide"}
        className={`grid size-8 shrink-0 place-items-center rounded-md transition ${
          isHidden
            ? "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            : "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
        }`}
      >
        {isHidden ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </li>
  );
}
