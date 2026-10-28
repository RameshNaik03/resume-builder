import ItemsEditor from "./ItemsEditor";
import ListEditor from "./ListEditor";
import TextField from "./TextField";

const PRESENT = "Present";

// Header text for a collapsed job, e.g. "Frontend Intern at Acme"
const getTitle = (job) => {
  if (job.role && job.company) return `${job.role} at ${job.company}`;
  return job.role || job.company || "New position";
};

export default function ExperienceForm({ items, onChange }) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      createItem={() => ({ company: "", role: "", subtitle: "", startDate: "", endDate: "", bullets: [""] })}
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

            <TextField
              label="Product or project (optional)"
              value={job.subtitle}
              onChange={(subtitle) => update({ subtitle })}
              placeholder="e.g. Acme Pay, a payments app (React, Node.js)"
            />

            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(event) => update({ endDate: event.target.checked ? PRESENT : "" })}
                className="size-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-600"
              />
              Currently working here
            </label>

            <ItemsEditor
              label="Key achievements"
              items={job.bullets ?? []}
              onChange={(bullets) => update({ bullets })}
              placeholder="e.g. Built a dashboard used by 500+ customers"
              addLabel="+ Add bullet point"
              itemName="Bullet point"
              rich
            />
          </>
        );
      }}
    />
  );
}
