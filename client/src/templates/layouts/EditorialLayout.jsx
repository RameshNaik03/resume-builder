import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSection, FoundationSectionList, PullQuote } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN, splitSections } from "./sectionLayout";

// Editorial (design foundation): magazine-style. A large serif name over a double masthead
// rule, the summary set as a pull quote, serif headings under a rule, and two columns (the main
// story on the left, a narrower column on the right) separated by a thin column rule.
// The rules and the quote mark carry the accent.
//
// Reading order: main column first, then the side column (each one whole). Two columns, so it
// isn't marked ATS-friendly, but the text still reads in order.

const VARS = foundationVars(
  { name: 30, headline: 12, heading: 11.5, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 },
  { section: 24, heading: 8, item: 16, bullet: 4 }
);

const OPTIONS = {
  heading: { variant: "over" },
  bodies: { summary: (data) => <PullQuote html={data.summary} /> },
};
// The lead pull quote sits right under the masthead rules, so its heading needs no rule of its own
const LEAD_OPTIONS = { ...OPTIONS, heading: { variant: "plain" } };

export default function EditorialLayout({ data }) {
  const { twoColumns, lead, main, side } = splitSections(data);

  return (
    <FoundationPage vars={VARS}>
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name font-normal">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} separator="bar" className="mt-[12pt]" />
        </WithPhoto>
        {/* Masthead: a heavy rule over a hairline */}
        <div className="mt-[16pt] h-[4pt] border-y border-(--line)" style={{ borderTopWidth: "2pt" }} aria-hidden="true" />
      </header>

      {lead && <FoundationSection data={data} section={lead} options={LEAD_OPTIONS} />}

      {twoColumns ? (
        // The section gap sits above the columns (not inside them), so the column rule starts
        // level with the first headings' rules
        <div className="mt-(--f-section-gap) grid" style={{ gridTemplateColumns: `${100 - data.sideRatio}fr ${data.sideRatio}fr` }}>
          <div className="min-w-0 pr-[8mm] [&>.f-section:first-child]:mt-0" data-column="main">
            <FoundationSectionList data={data} sections={main} options={OPTIONS} />
          </div>
          {/* The column rule is the side column's left border (it ends with the column's content) */}
          <div className="divider-l min-w-0 self-start pl-[8mm] [&>.f-section:first-child]:mt-0" data-column="side" data-fill-page>
            <FoundationSectionList data={data} sections={side} options={OPTIONS} />
          </div>
        </div>
      ) : (
        <FoundationSectionList data={data} sections={main} options={OPTIONS} />
      )}
    </FoundationPage>
  );
}
