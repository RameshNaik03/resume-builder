import ListEditor from "./ListEditor";
import TextField from "./TextField";

// Header text for a collapsed entry, e.g. "B.Tech CSE, ABC University"
const getTitle = (entry) => {
  if (entry.degree && entry.school) return `${entry.degree}, ${entry.school}`;
  return entry.degree || entry.school || "New education";
};

export default function EducationForm({ items, onChange }) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      createItem={() => ({ school: "", degree: "", year: "" })}
      getTitle={getTitle}
      addLabel="Add education"
      emptyText="No education added yet."
      renderFields={(entry, update) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="School / University"
              value={entry.school}
              onChange={(school) => update({ school })}
              placeholder="ABC University"
            />
          </div>
          <TextField
            label="Degree"
            value={entry.degree}
            onChange={(degree) => update({ degree })}
            placeholder="B.Tech in Computer Science"
          />
          <TextField label="Year" value={entry.year} onChange={(year) => update({ year })} placeholder="2021 – 2025" />
        </div>
      )}
    />
  );
}
