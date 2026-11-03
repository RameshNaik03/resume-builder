import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Classic (design foundation): centred sans-serif header, accent-coloured section headings
// with a hairline underneath, title and dates on one line with the company below.

const VARS = foundationVars({ headline: 11.5, heading: 10.5, jobTitle: 10.5, meta: 9.5 });

export default function ClassicLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[8pt]" />
        </WithPhoto>
      </header>

      <FoundationSections data={data} heading={{ variant: "underline" }} />
    </FoundationPage>
  );
}
