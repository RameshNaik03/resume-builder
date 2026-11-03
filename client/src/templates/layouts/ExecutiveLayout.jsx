import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Executive (design foundation): understated and formal. A large serif name in the accent
// colour, a hairline rule under the header, and serif section headings with rules beside
// them (centred between two rules by default; they follow the header alignment).
// Body text is sans-serif; one column, so it stays ATS-friendly.

const VARS = foundationVars(
  { headline: 11.5, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 },
  { section: 24, heading: 12, item: 12, bullet: 4 }
);

export default function ExecutiveLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name font-semibold">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} separator="bar" className="mt-[8pt]" />
        </WithPhoto>
        <div className="divider-rule mt-[16pt]" aria-hidden="true" />
      </header>

      <FoundationSections data={data} heading={{ variant: "ruled" }} />
    </FoundationPage>
  );
}
