import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DEFAULT_TEMPLATE_ID, TEMPLATES, getTemplate } from "../../templates/registry";
import { BULLET_LIMITS, STRENGTHS, bulletsHidden } from "./tailorChoices";
import { Badge } from "../ui/Display";
import { Checkbox, Field, Input, Select, Toggle } from "../ui/Form";
import Button from "../ui/Button";
import SortableRow from "../ui/SortableRow";

// The options panel before tailoring (Tailor page, step 2). Everything here is sent with
// POST /api/jobs/tailor (server: services/jobs/tailorResume.js).
//   options - from POST /api/jobs/options: { skills, projects, jobs, projectsFirst, template,
//             atsFriendly, fitOnePage, maxFeatured, suggestedTitle }
//   choices - { strength, skillOrder, featured, maxFeatured, excludedProjects, maxBulletsPerJob,
//             template, language, fitOnePage, title }; onChange(patch)

// A group of options: its heading, an optional line under it, then its controls
// (a fieldset's legend must be its first child, so nothing wraps it)
function Group({ title, description, children, as: Element = "div", ...props }) {
  const Title = Element === "fieldset" ? "legend" : "h4";
  return (
    <Element {...props}>
      <Title className="type-label text-fg">{title}</Title>
      {description && <p className="mt-0.5 type-small text-fg-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </Element>
  );
}

export default function TailorOptions({ options, choices, onChange, aiEnabled }) {
  const currentTemplate = getTemplate(options.template ?? DEFAULT_TEMPLATE_ID);
  const autoTemplate = options.atsFriendly ? `Keep ${currentTemplate.name}` : `Classic Navy (yours, ${currentTemplate.name}, isn't ATS-friendly)`;
  const chosenTemplate = choices.template ? getTemplate(choices.template) : null;
  const hidden = bulletsHidden(options.jobs, choices.maxBulletsPerJob);

  return (
    <section className="space-y-6 border-t border-line pt-6" aria-labelledby="tailor-options" data-testid="tailor-options">
      <h3 id="tailor-options" className="type-h3 text-fg">
        Options
      </h3>

      <fieldset disabled={!aiEnabled} className="group">
        <legend className="type-label text-fg">How much to rewrite</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="strength">
          {STRENGTHS.map((option) => {
            const selected = choices.strength === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 transition-colors group-disabled:cursor-not-allowed group-disabled:opacity-60 ${selected ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}
              >
                <input type="radio" name="strength" value={option.value} checked={selected} onChange={() => onChange({ strength: option.value })} className="mt-0.5 size-4 shrink-0 accent-accent" />
                <span>
                  <span className="block type-label text-fg">{option.label}</span>
                  <span className="block type-small text-fg-muted">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <FeaturedSkills options={options} choices={choices} onChange={onChange} />

      {options.projects.length > 0 && (
        <Group as="fieldset" title="Projects to include" description={options.projectsFirst ? "Your projects match this job better than your jobs do, so Projects will come before Experience." : undefined}>
          <ul className="space-y-2" data-testid="project-options">
            {options.projects.map((project) => (
              <li key={project.name}>
                <Checkbox
                  label={project.name}
                  description={project.score >= 6 ? "Matches the job well" : project.score > 0 ? "Matches the job a little" : "Nothing the job asks for"}
                  checked={!choices.excludedProjects.includes(project.name)}
                  onChange={(event) =>
                    onChange({ excludedProjects: event.target.checked ? choices.excludedProjects.filter((name) => name !== project.name) : [...choices.excludedProjects, project.name] })
                  }
                />
              </li>
            ))}
          </ul>
        </Group>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Field id="max-bullets" label="Max bullets per job">
            {(props) => (
              <Select {...props} value={choices.maxBulletsPerJob ?? ""} onChange={(event) => onChange({ maxBulletsPerJob: event.target.value ? Number(event.target.value) : null })}>
                <option value="">No limit</option>
                {BULLET_LIMITS.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <p className="mt-1.5 type-small text-fg-muted" data-testid="bullets-hidden-hint">
            {choices.maxBulletsPerJob
              ? hidden
                ? `Hides ${hidden} ${hidden === 1 ? "bullet" : "bullets"} that don't relate to the job. Nothing is deleted: restore them in the editor.`
                : "Nothing to hide: bullets that relate to the job always stay."
              : "Bullets that relate to the job always stay."}
          </p>
        </div>

        <div>
          <Field id="tailor-template" label="Template">
            {(props) => (
              <Select {...props} value={choices.template ?? ""} onChange={(event) => onChange({ template: event.target.value || null })}>
                <option value="">{autoTemplate}</option>
                {TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.atsFriendly ? "" : " (not ATS-friendly)"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {chosenTemplate && !chosenTemplate.atsFriendly && <p className="mt-1.5 type-small text-warning">This layout is harder for an ATS to read.</p>}
        </div>

        <div>
          <Field id="tailor-language" label="Language">
            {(props) => (
              <Select {...props} value={choices.language} onChange={(event) => onChange({ language: event.target.value })}>
                <option value="en">English</option>
                <option value="de">German (Deutsch)</option>
              </Select>
            )}
          </Field>
          {choices.language === "de" && (
            <p className="mt-1.5 type-small text-fg-muted">
              {aiEnabled ? "The headline, summary and reworded bullets are written in German; the headings are German." : "AI is off: only the section headings will be German; your text stays as written."}
            </p>
          )}
        </div>

        <div className="self-end rounded-lg border border-line px-3 py-2">
          <Toggle between checked={choices.fitOnePage} onChange={(fitOnePage) => onChange({ fitOnePage })} label="Fit to one page" />
        </div>
      </div>

      <Field id="tailor-title" label="Name of the tailored copy">
        {(props) => <Input {...props} maxLength={100} value={choices.title} onChange={(event) => onChange({ title: event.target.value, titleEdited: true })} />}
      </Field>
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
    return <p className="type-small text-fg-muted">Your resume doesn't show any of this job's skills yet, so there are none to feature.</p>;
  }
  return (
    <Group
      as="fieldset"
      title="Skills to feature"
      description="The ones your resume shows, most relevant first. They lead your Skills and summary, in this order."
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => over && active.id !== over.id && move(order.indexOf(active.id), order.indexOf(over.id))}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5" data-testid="featured-skills">
            {order.map((skill, index) => {
              const checked = choices.featured.includes(skill);
              const disabled = full && !checked;
              const entry = info[skill];
              return (
                <SortableRow key={skill} id={skill} label={skill} data-skill={skill}>
                  <label className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => onChange({ featured: event.target.checked ? [...choices.featured, skill] : choices.featured.filter((other) => other !== skill) })}
                      className="size-4 shrink-0 accent-accent"
                    />
                    <span className="truncate type-label text-fg">{skill}</span>
                    {entry?.required && <Badge tone="accent">Must-have</Badge>}
                    <span className="hidden type-small text-fg-subtle sm:inline">shown {entry?.shownIn ?? 0}×</span>
                  </label>
                  <Button variant="ghost" size="sm" iconOnly icon={ChevronUp} onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${skill} up`} />
                  <Button variant="ghost" size="sm" iconOnly icon={ChevronDown} onClick={() => move(index, index + 1)} disabled={index === order.length - 1} aria-label={`Move ${skill} down`} />
                </SortableRow>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="mt-2 flex items-center gap-2 type-small text-fg-muted">
        <span aria-live="polite">{featured.length} featured, at most</span>
        {/* The control is full width by design; the wrapper sets its width */}
        <div className="w-20 shrink-0">
          <Input
          type="number"
          min={1}
          max={options.maxFeatured}
          value={choices.maxFeatured}
          onChange={(event) => {
            const maxFeatured = Math.min(options.maxFeatured, Math.max(1, Number(event.target.value) || 1));
            onChange({ maxFeatured, featured: featured.slice(0, maxFeatured) });
          }}
          aria-label="Most skills to feature"
          />
        </div>
      </div>
    </Group>
  );
}
