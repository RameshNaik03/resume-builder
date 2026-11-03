import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Elegant Serif (design foundation): a centred header with a large serif name and an italic
// serif headline, title-case serif headings in the accent colour with a short rule under
// them, and generous spacing throughout. Body text stays sans-serif for easy reading.

const VARS = foundationVars(
  { name: 30, headline: 12, heading: 11.5, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 },
  { section: 24, heading: 8, item: 16, bullet: 4 }
);

export default function ElegantSerifLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name font-semibold">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt] font-heading italic">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[12pt]" />
        </WithPhoto>
      </header>

      <FoundationSections data={data} heading={{ variant: "short", caps: false }} />
    </FoundationPage>
  );
}
