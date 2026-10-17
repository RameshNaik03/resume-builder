import ListEditor from "./ListEditor";
import TextField from "./TextField";

const PRESENT = "Present";

// Header text for a collapsed job, e.g. "Frontend Intern at Acme"
const getTitle = (job) => {
  if (job.role && job.company) return `${job.role} at ${job.company}`;
  return job.role || job.company || "New position";
};

// The bullet point list inside one job
function BulletsEditor({ bullets, onChange }) {
  const updateBullet = (index, text) => onChange(bullets.map((b, i) => (i === index ? text : b)));
  const removeBullet = (index) => onChange(bullets.filter((_, i) => i !== index));
  const addBullet = () => onChange([...bullets, ""]);

  return (
    <div>
      <p className="label">Key achievements</p>
      <ul className="space-y-2">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="text-slate-400" aria-hidden="true">•</span>
            <input
              type="text"
              value={bullet}
              onChange={(event) => updateBullet(index, event.target.value)}
              placeholder="e.g. Built a dashboard used by 500+ customers"
              aria-label={`Bullet point ${index + 1}`}
              className="input"
            />
            <button
              type="button"
              onClick={() => removeBullet(index)}
              aria-label={`Remove bullet point ${index + 1}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addBullet}
        className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        + Add bullet point
      </button>
    </div>
  );
}

export default function ExperienceForm({ items, onChange }) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      createItem={() => ({ company: "", role: "", startDate: "", endDate: "", bullets: [""] })}
      getTitle={getTitle}
      addLabel="Add experience"
      emptyText="No experience added yet. Internships and part-time jobs count too!"
      renderFields={(job, update) => {
        const isCurrent = job.endDate === PRESENT;

        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Role" value={job.role} onChange={(role) => update({ role })} placeholder="Frontend Intern" />
              <TextField label="Company" value={job.company} onChange={(company) => update({ company })} placeholder="Acme Inc." />
              <TextField
                label="Start date"
                value={job.startDate}
                onChange={(startDate) => update({ startDate })}
                placeholder="Jan 2024"
              />
              <TextField
                label="End date"
                value={job.endDate}
                onChange={(endDate) => update({ endDate })}
                placeholder="Jun 2024"
                disabled={isCurrent}
              />
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(event) => update({ endDate: event.target.checked ? PRESENT : "" })}
                className="size-4 rounded border-slate-300 accent-indigo-600"
              />
              Currently working here
            </label>

            <BulletsEditor bullets={job.bullets ?? []} onChange={(bullets) => update({ bullets })} />
          </>
        );
      }}
    />
  );
}
