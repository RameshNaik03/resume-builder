// A simple live preview of the resume.
// The real, print-ready template replaces this in Phase 7.
export default function ResumePreview({ resume }) {
  const { personalInfo = {}, summary, skills = [] } = resume;

  // Only show contact details that have been filled in
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
  ].filter(Boolean);

  const isEmpty = !personalInfo.fullName && contactItems.length === 0 && !summary && skills.length === 0;

  return (
    <div className="min-h-[600px] bg-white p-8 text-slate-800 shadow-sm ring-1 ring-slate-200 sm:p-10">
      {isEmpty ? (
        <p className="pt-40 text-center text-sm text-slate-400">Start filling in the form to see your resume here.</p>
      ) : (
        <>
          {/* Header */}
          <header className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || "Your Name"}</h1>
            {contactItems.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">{contactItems.join("  •  ")}</p>
            )}
          </header>

          {summary && (
            <section className="mt-5">
              <h2 className="text-xs font-bold tracking-wider text-indigo-700 uppercase">Summary</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{summary}</p>
            </section>
          )}

          {skills.length > 0 && (
            <section className="mt-5">
              <h2 className="text-xs font-bold tracking-wider text-indigo-700 uppercase">Skills</h2>
              <p className="mt-2 text-sm">{skills.join(", ")}</p>
            </section>
          )}

          {/* Experience, Education and Projects will be added in the next phase */}
        </>
      )}
    </div>
  );
}
