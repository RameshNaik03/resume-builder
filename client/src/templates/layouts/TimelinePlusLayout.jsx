import { foundationVars } from "../foundation/tokens";
import { ContactLine, DatedEducationList, FoundationPage, FoundationSections, TimelineList } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN, splitSections } from "./sectionLayout";

// Timeline Plus (design foundation): experience on a vertical timeline, with the dates in a
// left column beside a drawn dot for each job and a line joining them. Education keeps the
// same date column; every other section's text lines up with the timeline's text column.
// With two columns (Design tab) the columns are too narrow for a date column, so the dates
// move above each title. The dots and line are the layout's one use of the accent.

const VARS = foundationVars({ headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 });

const optionsFor = (stacked) => ({
  heading: { variant: "underline" },
  bodies: {
    experience: (data) => <TimelineList jobs={data.experience} stacked={stacked} />,
    education: (data) => <DatedEducationList entries={data.education} stacked={stacked} />,
  },
  bodyClassName: stacked ? "" : "f-indent",
});
const OPTIONS = { wide: optionsFor(false), stacked: optionsFor(true) };

export default function TimelinePlusLayout({ data }) {
  const options = splitSections(data).twoColumns ? OPTIONS.stacked : OPTIONS.wide;
  return (
    <FoundationPage vars={VARS} className="f-tl-root">
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[8pt]" />
        </WithPhoto>
      </header>

      <FoundationSections data={data} {...options} />
    </FoundationPage>
  );
}
