import { Plus, X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import Button from "../ui/Button";
import { Input } from "../ui/Form";

// An editable list of short text lines: add, edit and remove.
// Used for a job's bullet points and for the items of an additional section.
//   rich - each line gets bold / italic / underline / link formatting (bullet points);
//          its toolbar only shows while that line is being edited
export default function ItemsEditor({ label, items, onChange, placeholder, addLabel = "Add item", itemName = "item", rich = false }) {
  const updateItem = (index, text) => onChange(items.map((item, i) => (i === index ? text : item)));
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
  const addItem = () => onChange([...items, ""]);

  return (
    <div>
      <p className="label">{label}</p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className={`flex gap-2 ${rich ? "items-start" : "items-center"}`}>
            <span className={`text-fg-subtle ${rich ? "mt-2" : ""}`} aria-hidden="true">
              •
            </span>
            {rich ? (
              <div className="min-w-0 flex-1">
                <RichTextEditor inline toolbar="focus" value={item} onChange={(html) => updateItem(index, html)} placeholder={placeholder} ariaLabel={`${itemName} ${index + 1}`} />
              </div>
            ) : (
              <Input value={item} onChange={(event) => updateItem(index, event.target.value)} placeholder={placeholder} aria-label={`${itemName} ${index + 1}`} />
            )}
            <Button
              variant="ghostDanger"
              size="sm"
              iconOnly
              icon={X}
              onClick={() => removeItem(index)}
              aria-label={`Remove ${itemName} ${index + 1}`}
              className={rich ? "mt-0.5" : ""}
            />
          </li>
        ))}
      </ul>
      <Button variant="link" icon={Plus} onClick={addItem} className="mt-2 type-small">
        {addLabel.replace(/^\+\s*/, "")}
      </Button>
    </div>
  );
}
