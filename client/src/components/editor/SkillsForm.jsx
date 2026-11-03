import { useState } from "react";

// skills = array of strings; skillLevels = [{ name, level }] (optional 1-5 per skill)
// onChange receives the changed fields: { skills, skillLevels }
export default function SkillsForm({ skills, skillLevels = [], onChange }) {
  const [input, setInput] = useState("");
  const [showLevels, setShowLevels] = useState(() => skillLevels.length > 0);

  const levelOf = (skill) => skillLevels.find((entry) => entry.name.toLowerCase() === skill.toLowerCase())?.level ?? null;

  const addSkill = () => {
    const skill = input.trim();
    if (!skill) return;

    // Ignore duplicates, ignoring upper/lower case ("react" = "React")
    const alreadyAdded = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (!alreadyAdded) {
      onChange({ skills: [...skills, skill] });
    }
    setInput("");
  };

  // A removed skill also loses its level
  const removeSkill = (skillToRemove) => {
    onChange({
      skills: skills.filter((s) => s !== skillToRemove),
      skillLevels: skillLevels.filter((entry) => entry.name.toLowerCase() !== skillToRemove.toLowerCase()),
    });
  };

  // level null clears it
  const setLevel = (skill, level) => {
    const others = skillLevels.filter((entry) => entry.name.toLowerCase() !== skill.toLowerCase());
    onChange({ skillLevels: level ? [...others, { name: skill, level }] : others });
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
              className="flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 py-1 pl-3 pr-1 text-sm font-medium text-indigo-700 dark:text-indigo-300"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="grid size-5 place-items-center rounded-full text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300"
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
        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">No skills added yet.</p>
      )}

      {/* Optional levels (shown as bars or dots by templates such as Infographic) */}
      {skills.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowLevels((shown) => !shown)}
            aria-expanded={showLevels}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {showLevels ? "Hide skill levels" : "Add skill levels (optional)"}
          </button>
          {showLevels && (
            <div className="mt-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rate only the skills you want to. Templates that show levels (like Infographic) draw them as bars or dots; skills
                without a level appear as plain tags.
              </p>
              <ul className="mt-3 space-y-2">
                {skills.map((skill) => {
                  const level = levelOf(skill);
                  return (
                    <li key={skill} className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-slate-700 dark:text-slate-300">{skill}</span>
                      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`${skill} level`}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setLevel(skill, value === level ? null : value)}
                            aria-label={`${skill}: level ${value} of 5`}
                            aria-pressed={level !== null && value <= level}
                            className={`size-4 rounded-full ring-1 transition ${
                              level !== null && value <= level
                                ? "bg-indigo-600 ring-indigo-600 dark:bg-indigo-400 dark:ring-indigo-400"
                                : "bg-transparent ring-slate-300 hover:ring-indigo-400 dark:ring-slate-600"
                            }`}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => setLevel(skill, null)}
                          disabled={level === null}
                          className="ml-2 w-10 text-xs text-slate-500 hover:text-slate-800 disabled:invisible dark:text-slate-400 dark:hover:text-slate-100"
                          aria-label={`Clear the level for ${skill}`}
                        >
                          Clear
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
