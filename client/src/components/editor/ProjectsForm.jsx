import ListEditor from "./ListEditor";
import TextField from "./TextField";

export default function ProjectsForm({ items, onChange }) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      createItem={() => ({ name: "", description: "", link: "" })}
      getTitle={(project) => project.name || "New project"}
      addLabel="Add project"
      emptyText="No projects added yet. Personal and college projects are great to show!"
      renderFields={(project, update) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Project name"
              value={project.name}
              onChange={(name) => update({ name })}
              placeholder="Resume Builder"
            />
            <TextField
              label="Link"
              value={project.link}
              onChange={(link) => update({ link })}
              placeholder="github.com/you/project"
            />
          </div>
          <TextField
            label="Description"
            multiline
            rows={3}
            value={project.description}
            onChange={(description) => update({ description })}
            placeholder="What it does, the tech you used, and what you learned."
          />
        </>
      )}
    />
  );
}
