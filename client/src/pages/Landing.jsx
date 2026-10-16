import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    title: "Simple editor",
    text: "Fill in your details section by section. No design skills needed.",
  },
  {
    title: "Clean templates",
    text: "Professional layouts that are easy for recruiters to read.",
  },
  {
    title: "Download as PDF",
    text: "Export a print-ready PDF in one click, whenever you need it.",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          Free and easy to use
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Build a resume that gets you <span className="text-indigo-600">noticed</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Create, edit and download professional resumes in minutes. Save as many versions as you
          like and tailor each one to the job you want.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to={user ? "/dashboard" : "/register"} className="btn-primary px-6 py-3 text-base">
            {user ? "Go to dashboard" : "Get started"}
          </Link>
          {!user && (
            <Link to="/login" className="btn-secondary px-6 py-3 text-base">
              I already have an account
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {features.map((feature, index) => (
          <div key={feature.title} className="card p-6">
            <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">
              {index + 1}
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
