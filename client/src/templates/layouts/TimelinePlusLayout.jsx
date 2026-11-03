import { foundationVars } from "../foundation/tokens";
import { ContactLine, DatedEducationList, FoundationPage, FoundationSections, TimelineList } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Timeline Plus (design foundation): experience on a vertical timeline, with the dates in a
// left column beside a drawn dot for each job and a line joining them. Education keeps the
// same date column; every other section's text lines up with the timeline's text column.
// The dots and line are the layout's one use of the accent.

const VARS = foundationVars({ name: 28, headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 });

const OPTIONS = {
  heading: { variant: "underline" },
  bodies: {
    experience: (data) => <TimelineList jobs={data.experience} />,
    education: (data) => <DatedEducationList entries={data.education} />,
  },
  bodyClassName: "f-indent",
};

export default function TimelinePlusLayout({ data }) {
  return (
    <FoundationPage vars={VARS} className="f-tl-root">
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[8pt]" />
        </WithPhoto>
      </header>

      <FoundationSections data={data} {...OPTIONS} />
    </FoundationPage>
  );
}
