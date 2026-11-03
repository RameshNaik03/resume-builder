import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Soft Header (design foundation): the name and contact details sit on a pale tint of the
// accent that runs to the page edges; the rest of the page is plain white with hairline
// headings. The name carries the accent colour.
// Full bleed: the band reaches the page edges, so this layout applies the page margins itself
// (pages 2, 3... get their top margin from templates/pagination.js).

const VARS = foundationVars({ headline: 11.5, heading: 11.5, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.15 });

export default function SoftHeaderLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header className="bg-(--soft) pt-[24pt] pr-(--m-right) pb-[24pt] pl-(--m-left)" style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign} defaultBorderColor="var(--bg)">
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[8pt]" />
        </WithPhoto>
      </header>

      <div className="pr-(--m-right) pb-(--m-bottom) pl-(--m-left)">
        <FoundationSections data={data} heading={{ variant: "underline" }} />
      </div>
    </FoundationPage>
  );
}
