// The list of inputs to show, so we don't repeat the same JSX six times
const FIELDS = [
  { name: "fullName", label: "Full name", placeholder: "Ramesh Naik", type: "text" },
  { name: "headline", label: "Professional title", placeholder: "Full Stack Developer", type: "text" },
  { name: "email", label: "Email", placeholder: "you@example.com", type: "email" },
  { name: "phone", label: "Phone", placeholder: "+91 98765 43210", type: "tel" },
  { name: "location", label: "Location", placeholder: "Bengaluru, India", type: "text" },
  { name: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/yourname", type: "text" },
  { name: "github", label: "GitHub", placeholder: "github.com/yourname", type: "text" },
];

import PhotoUpload from "./PhotoUpload";

// data = resume.personalInfo, onChange receives the updated personalInfo object.
// The photo has its own upload route: onPhotoChange receives the new photo URL.
export default function PersonalInfoForm({ data, onChange, resumeId, onPhotoChange }) {
  const handleChange = (event) => {
    onChange({ ...data, [event.target.name]: event.target.value });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <PhotoUpload resumeId={resumeId} photoUrl={data.photoUrl ?? ""} onPhotoChange={onPhotoChange} />
      </div>
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="label">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            value={data[field.name] ?? ""}
            onChange={handleChange}
            placeholder={field.placeholder}
            className="input"
          />
        </div>
      ))}
    </div>
  );
}
