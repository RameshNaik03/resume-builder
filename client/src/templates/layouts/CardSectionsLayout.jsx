import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Card Sections (design foundation): every section sits in a softly tinted rounded card with
// the same 16pt padding, headings in the accent colour. A section that runs onto the next
// page continues in a new card segment there (the tint is cut at the page break).

const VARS = foundationVars({ name: 28, headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 }, { section: 12 });

export default function CardSectionsLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header className="pb-[4pt]" style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[8pt]" />
        </WithPhoto>
      </header>

      <FoundationSections data={data} heading={{ variant: "plain" }} card />
    </FoundationPage>
  );
}
