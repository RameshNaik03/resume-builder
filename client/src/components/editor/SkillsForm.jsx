import { useState } from "react";

// skills = array of strings, onChange receives the new array
export default function SkillsForm({ skills, onChange }) {
  const [input, setInput] = useState("");

  const addSkill = () => {
    const skill = input.trim();
    if (!skill) return;

    // Ignore duplicates, ignoring upper/lower case ("react" = "React")
    const alreadyAdded = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (!alreadyAdded) {
      onChange([...skills, skill]);
    }
    setInput("");
  };

  const removeSkill = (skillToRemove) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill();
    }
    // Backspace in an empty input removes the last tag
    if (event.key === "Backspace" && input === "" && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  };

  return (
    <div>
      <label htmlFor="skill-input" className="label">
        Skills
      </label>
      <div className="flex gap-2">
        <input
          id="skill-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. React, then press Enter"
          className="input"
        />
        <button type="button" onClick={addSkill} className="btn-secondary shrink-0">
          Add
        </button>
      </div>

      {skills.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li
              key={skill}
              className="flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm font-medium text-indigo-700"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="grid size-5 place-items-center rounded-full text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
                aria-label={`Remove ${skill}`}
              >
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No skills added yet.</p>
      )}
    </div>
  );
}
