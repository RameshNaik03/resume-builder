import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Compact Pro (design foundation): dense but readable, for long careers. Smaller type and
// tighter rhythm, "Role, Company" on one line with the dates, and headings followed by a
// hairline rule. The accent is used only for the rules.

const VARS = foundationVars(
  { name: 24, headline: 11, heading: 10.5, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.15 },
  { section: 12, heading: 4, item: 8, bullet: 0 }
);

export default function CompactProLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} separator="bar" className="mt-[4pt]" />
        </WithPhoto>
        {/* Rule under the header, in the divider colour (the accent by default) */}
        <div
          className="mt-[8pt] border-(--line)"
          style={{ borderTopWidth: "calc(1.5pt * var(--divider-on, 1))", borderTopStyle: "var(--divider-style, solid)" }}
          aria-hidden="true"
        />
      </header>

      <FoundationSections data={data} heading={{ variant: "ruled" }} orgInline />
    </FoundationPage>
  );
}
