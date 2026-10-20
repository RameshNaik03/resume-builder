import { useId } from "react";

// A label + input pair. onChange receives the new text (not the event).
export default function TextField({ label, value, onChange, multiline = false, ...inputProps }) {
  const id = useId(); // Unique id so the label is linked to its input
  const Input = multiline ? "textarea" : "input";

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <Input
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={`input ${multiline ? "resize-y" : ""}`}
        {...inputProps}
      />
    </div>
  );
}
