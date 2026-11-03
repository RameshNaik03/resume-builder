import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Bold Header (design foundation): a full-width block in the accent colour with the name,
// title and contact details in white, then a clean white body with hairline headings.
// The header block is the layout's one use of the accent.
// Full bleed: the block reaches the page edges, so this layout applies the page margins itself
// (pages 2, 3... get their top margin from templates/pagination.js).

const VARS = foundationVars({ headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 });

export default function BoldHeaderLayout({ data }) {
  return (
    <FoundationPage vars={VARS}>
      <header className="f-on-accent bg-(--accent) pt-[32pt] pr-(--m-right) pb-[24pt] pl-(--m-left)" style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign} defaultBorderColor="var(--on-accent)">
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} className="mt-[12pt]" />
        </WithPhoto>
      </header>

      <div className="pr-(--m-right) pb-(--m-bottom) pl-(--m-left)">
        <FoundationSections data={data} heading={{ variant: "underline" }} />
      </div>
    </FoundationPage>
  );
}
