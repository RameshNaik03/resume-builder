import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Modern Line (design foundation): a crisp left-aligned header and section headings marked
// by a solid accent bar on their left. The accent is used only for the bars.

const VARS = foundationVars({ name: 28, headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 });

export default function ModernLineLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} separator="bar" className="mt-[8pt]" />
        </WithPhoto>
      </header>

      <FoundationSections data={data} heading={{ variant: "bar" }} />
    </FoundationPage>
  );
}
