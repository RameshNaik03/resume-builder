import ItemsEditor from "./ItemsEditor";
import ListEditor from "./ListEditor";
import TextField from "./TextField";

// Extra sections with your own heading: Certifications, Languages, Awards, Volunteering...
export default function AdditionalForm({ items, onChange }) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      createItem={() => ({ heading: "", items: [""] })}
      getTitle={(section) => section.heading || "New section"}
      addLabel="Add section"
      emptyText="No extra sections yet. Add certifications, languages, awards or anything else."
      renderFields={(section, update) => (
        <>
          <TextField
            label="Section heading"
            value={section.heading}
            onChange={(heading) => update({ heading })}
            placeholder="e.g. Certifications"
          />
          <ItemsEditor
            label="Items"
            items={section.items ?? []}
            onChange={(sectionItems) => update({ items: sectionItems })}
            placeholder="e.g. AWS Certified Cloud Practitioner (2024)"
            itemName="Item"
          />
        </>
      )}
    />
  );
}
