import { foundationVars } from "../foundation/tokens";
import { CareerStrip, ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Infographic (design foundation): icon-led section headings, rated skills drawn as five-dot
// levels (only the skills the user rated; the others stay plain tags), and a drawn career strip
// under the header spanning the first job's start to the last job's end. Every graphic is
// drawn (no text in it), and the accent is used only for the graphics.

const VARS = foundationVars({ name: 28, headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 });

export default function InfographicLayout({ data }) {
  const showStrip = data.sections.some((section) => section.id === "experience");

  return (
    <FoundationPage vars={VARS} style={{ "--icon-color": "var(--line)" }}>
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[8pt]" />
        </WithPhoto>
      </header>
      {showStrip && <CareerStrip jobs={data.experience} className="mt-[16pt]" />}

      <FoundationSections data={data} heading={{ variant: "underline" }} icons defaultSkills="levels" />
    </FoundationPage>
  );
}
