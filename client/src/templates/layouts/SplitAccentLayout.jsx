import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Split Accent (design foundation): a slim accent strip down the left edge of every page and
// section headings led by small drawn icons in the accent. Headings and name stay near-black;
// the strip and icons are the layout's one use of the accent.
// Full bleed: the strip is drawn down the whole sheet by the page root, so this layout applies
// the page margins itself.

const VARS = foundationVars({ name: 28, headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 });
const STRIP = "5mm";

export default function SplitAccentLayout({ data }) {
  return (
    <FoundationPage
      vars={VARS}
      fill
      className="pt-(--m-top) pr-(--m-right) pb-(--m-bottom) pl-(--m-left)"
      style={{ backgroundImage: `linear-gradient(to right, var(--accent) 0 ${STRIP}, transparent ${STRIP} 100%)`, "--icon-color": "var(--accent)" }}
    >
      <header style={HEADER_ALIGN} data-block>
        <WithPhoto photo={data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          <ContactLine contacts={data.contacts} separator="bar" className="mt-[8pt]" />
        </WithPhoto>
      </header>

      <FoundationSections data={data} heading={{ variant: "underline" }} icons />
    </FoundationPage>
  );
}
