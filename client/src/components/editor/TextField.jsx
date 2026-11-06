import { useId } from "react";
import { Input, Textarea } from "../ui/Form";

// A label + input pair (the design system's Input / Textarea). onChange receives the new text
// (not the event).
export default function TextField({ label, value, onChange, multiline = false, ...inputProps }) {
  const id = useId(); // Unique id so the label is linked to its input
  const Control = multiline ? Textarea : Input;

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <Control id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={multiline ? "resize-y" : ""} {...inputProps} />
    </div>
  );
}
