import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// A password field with an eye button to show or hide what was typed.
// Takes the same props as <input>, including react-hook-form's {...register()}.
export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`input pr-10 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-400 transition hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:text-slate-200"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
