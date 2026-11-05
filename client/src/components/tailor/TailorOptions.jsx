import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import Switch from "../Switch";
import { DEFAULT_TEMPLATE_ID, TEMPLATES, getTemplate } from "../../templates/registry";
import { BULLET_LIMITS, STRENGTHS, bulletsHidden } from "./tailorChoices";

// The options panel before tailoring (Tailor page, step 2). Everything here is sent with
// POST /api/jobs/tailor (server: services/jobs/tailorResume.js).
//   options - from POST /api/jobs/options: { skills, projects, jobs, projectsFirst, template,
//             atsFriendly, fitOnePage, maxFeatured, suggestedTitle }
//   choices - { strength, skillOrder, featured, maxFeatured, excludedProjects, maxBulletsPerJob,
//             template, language, fitOnePage, title }; onChange(patch)

export default function TailorOptions({ options, choices, onChange, aiEnabled }) {
  const currentTemplate = getTemplate(options.template ?? DEFAULT_TEMPLATE_ID);
  const autoTemplate = options.atsFriendly ? `Keep ${currentTemplate.name}` : `Classic Navy (yours, ${currentTemplate.name}, isn't ATS-friendly)`;
  const chosenTemplate = choices.template ? getTemplate(choices.template) : null;
  const hidden = bulletsHidden(options.jobs, choices.maxBulletsPerJob);

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-700" aria-labelledby="tailor-options" data-testid="tailor-options">
      <h3 id="tailor-options" className="font-semibold text-slate-900 dark:text-white">
        Options
      </h3>

      <fieldset disabled={!aiEnabled} className={!aiEnabled ? "opacity-60" : ""}>
        <legend className="text-sm font-semibold text-slate-900 dark:text-white">How much to rewrite</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3" data-testid="strength">
          {STRENGTHS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-2 rounded-xl border p-3 text-sm ${choices.strength === option.value ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40" : "border-slate-200 dark:border-slate-700"}`}
            >
              <input type="radio" name="strength" value={option.value} checked={choices.strength === option.value} onChange={() => onChange({ strength: option.value })} className="mt-0.5" />
              <span>
                <span className="block font-medium text-slate-900 dark:text-white">{option.label}</span>
                <span className="block text-slate-500 dark:text-slate-400">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FeaturedSkills options={options} choices={choices} onChange={onChange} />

      {options.projects.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900 dark:text-white">Projects to include</legend>
          <ul className="mt-2 space-y-1.5" data-testid="project-options">
            {options.projects.map((project) => (
              <li key={project.name}>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={!choices.excludedProjects.includes(project.name)}
                    onChange={(event) =>
                      onChange({ excludedProjects: event.target.checked ? choices.excludedProjects.filter((name) => name !== project.name) : [...choices.excludedProjects, project.name] })
                    }
                    className="size-4 accent-indigo-600"
                  />
                  {project.name}
                  <span className="text-xs text-slate-400">{project.score >= 6 ? "· matches the job well" : project.score > 0 ? "· matches the job a little" : "· nothing the job asks for"}</span>
                </label>
              </li>
            ))}
          </ul>
          {options.projectsFirst && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Your projects match this job better than your jobs do, so Projects will come before Experience.</p>}
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="max-bullets" className="label">
            Max bullets per job
          </label>
          <select
            id="max-bullets"
            className="input"
            value={choices.maxBulletsPerJob ?? ""}
            onChange={(event) => onChange({ maxBulletsPerJob: event.target.value ? Number(event.target.value) : null })}
          >
            <option value="">No limit</option>
            {BULLET_LIMITS.map((limit) => (
              <option key={limit} value={limit}>
                {limit}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400" data-testid="bullets-hidden-hint">
            {choices.maxBulletsPerJob
              ? hidden
                ? `Hides ${hidden} ${hidden === 1 ? "bullet" : "bullets"} that don't relate to the job. Nothing is deleted: restore them in the editor.`
                : "Nothing to hide: bullets that relate to the job always stay."
              : "Bullets that relate to the job always stay."}
          </p>
        </div>

        <div>
          <label htmlFor="tailor-template" className="label">
            Template
          </label>
          <select id="tailor-template" className="input" value={choices.template ?? ""} onChange={(event) => onChange({ template: event.target.value || null })}>
            <option value="">{autoTemplate}</option>
            {TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.atsFriendly ? "" : " (not ATS-friendly)"}
              </option>
            ))}
          </select>
          {chosenTemplate && !chosenTemplate.atsFriendly && <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">This layout is harder for an ATS to read.</p>}
        </div>

        <div>
          <label htmlFor="tailor-language" className="label">
            Language
          </label>
          <select id="tailor-language" className="input" value={choices.language} onChange={(event) => onChange({ language: event.target.value })}>
            <option value="en">English</option>
            <option value="de">German (Deutsch)</option>
          </select>
          {choices.language === "de" && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {aiEnabled ? "The headline, summary and reworded bullets are written in German; the headings are German." : "AI is off: only the section headings will be German; your text stays as written."}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 self-end rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200" id="fit-one-page-label">
            Fit to one page
          </span>
          <Switch checked={choices.fitOnePage} onChange={(fitOnePage) => onChange({ fitOnePage })} label="Fit to one page" />
        </div>
      </div>

      <div>
        <label htmlFor="tailor-title" className="label">
          Name of the tailored copy
        </label>
        <input id="tailor-title" className="input" maxLength={100} value={choices.title} onChange={(event) => onChange({ title: event.target.value, titleEdited: true })} />
      </div>
    </section>
  );
}

// The job's skills the resume shows: tick the ones to feature (up to the max), drag (or use the
// arrows) to set their order. Featured skills lead the Skills section and the summary.
function FeaturedSkills({ options, choices, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const info = Object.fromEntries(options.skills.map((entry) => [entry.skill, entry]));
  const order = choices.skillOrder;
  const featured = order.filter((skill) => choices.featured.includes(skill));
  const full = featured.length >= choices.maxFeatured;
  const move = (from, to) => to >= 0 && to < order.length && onChange({ skillOrder: arrayMove(order, from, to) });

  if (!order.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Your resume doesn't show any of this job's skills yet, so there are none to feature.</p>;
  }
  return (
    <fieldset>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <legend className="text-sm font-semibold text-slate-900 dark:text-white">Skills to feature</legend>
        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          At most
          <input
            type="number"
            min={1}
            max={options.maxFeatured}
            value={choices.maxFeatured}
            onChange={(event) => {
              const maxFeatured = Math.min(options.maxFeatured, Math.max(1, Number(event.target.value) || 1));
              onChange({ maxFeatured, featured: featured.slice(0, maxFeatured) });
            }}
            className="input w-16 px-2 py-1"
            aria-label="Most skills to feature"
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The ones your resume shows, most relevant first. They lead your Skills and summary, in this order.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => over && active.id !== over.id && move(order.indexOf(active.id), order.indexOf(over.id))}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="mt-2 space-y-1.5" data-testid="featured-skills">
            {order.map((skill, index) => (
              <SkillRow
                key={skill}
                skill={skill}
                entry={info[skill]}
                checked={choices.featured.includes(skill)}
                disabled={full && !choices.featured.includes(skill)}
                onToggle={(on) => onChange({ featured: on ? [...choices.featured, skill] : choices.featured.filter((other) => other !== skill) })}
                onUp={index > 0 ? () => move(index, index - 1) : null}
                onDown={index < order.length - 1 ? () => move(index, index + 1) : null}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {featured.length} of at most {choices.maxFeatured} featured
      </p>
    </fieldset>
  );
}

function SkillRow({ skill, entry, checked, disabled, onToggle, onUp, onDown }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: skill });
  const arrow = "grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 ${isDragging ? "relative z-10 shadow-lg ring-2 ring-indigo-500" : ""}`}
      data-skill={skill}
    >
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Move ${skill}`} className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-slate-400 hover:bg-slate-100 active:cursor-grabbing dark:hover:bg-slate-800">
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <label className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onToggle(event.target.checked)} className="size-4 accent-indigo-600" />
        <span className="truncate font-medium text-slate-800 dark:text-slate-200">{skill}</span>
        {entry?.required && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">Must-have</span>}
        <span className="hidden text-xs text-slate-400 sm:inline">shown {entry?.shownIn ?? 0}×</span>
      </label>
      <button type="button" onClick={onUp} disabled={!onUp} className={arrow} aria-label={`Move ${skill} up`}>
        <ChevronUp className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onDown} disabled={!onDown} className={arrow} aria-label={`Move ${skill} down`}>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}
