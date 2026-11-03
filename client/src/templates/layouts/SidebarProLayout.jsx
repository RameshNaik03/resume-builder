import { foundationVars } from "../foundation/tokens";
import { ContactList, FoundationPage, FoundationSectionList } from "../foundation/components";
import { Photo, WithPhoto } from "./shared";
import { HEADER_ALIGN, splitSections } from "./sectionLayout";

// Sidebar Pro (design foundation): a full-height accent sidebar with the photo, contact
// details and the side sections (skills, languages...) in white, beside a white main column
// with the name and the main sections. Thin accent rules under the main headings.
//
// Reading order: in the page source the name comes first, then the sidebar (contact, then its
// sections), then the main column; CSS grid areas place them on the page. So an ATS reads the
// name and contact first, and each column's text stays together.
// Full bleed: the sidebar colour runs to the page edges on every page (drawn down the whole
// sheet by the page root), so this layout applies the page margins itself.

const VARS = foundationVars({ headline: 12, heading: 11, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 });
const PAD = "8mm"; // Inner padding of the sidebar and the gap to the main column

export default function SidebarProLayout({ data }) {
  // With one column (Design tab), every section goes in the main column
  const { side, main } = splitSections(data, { leadSummary: false });
  const ratio = data.sideRatio;
  const photoInSidebar = data.photo?.position === "sidebar";

  return (
    <FoundationPage
      vars={VARS}
      fill
      className="grid"
      style={{
        backgroundImage: `linear-gradient(to right, var(--accent) 0 ${ratio}%, transparent ${ratio}% 100%)`,
        gridTemplateColumns: `${ratio}% minmax(0, 1fr)`,
        gridTemplateRows: "auto 1fr",
        gridTemplateAreas: '"side head" "side main"',
      }}
    >
      {/* Name (first in the page source) */}
      <header className="pt-(--m-top) pr-(--m-right)" style={{ gridArea: "head", paddingLeft: PAD, ...HEADER_ALIGN }} data-column="main" data-block>
        <WithPhoto photo={photoInSidebar ? null : data.photo} align={data.headerAlign}>
          <h1 className="f-name">{data.name}</h1>
          {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
        </WithPhoto>
      </header>

      {/* Sidebar: photo, contact details, side sections */}
      <aside className="f-on-accent min-w-0 pt-(--m-top) pb-(--m-bottom)" style={{ gridArea: "side", paddingInline: PAD }} data-column="side">
        {photoInSidebar && <Photo photo={data.photo} defaultBorderColor="var(--on-accent)" className="mx-auto mb-[16pt]" />}
        <ContactList contacts={data.contacts} />

        <FoundationSectionList data={data} sections={side} options={{ heading: { variant: "underline" }, defaultSkills: "tags" }} />
      </aside>

      {/* Main column */}
      <main className="min-w-0 pr-(--m-right) pb-(--m-bottom)" style={{ gridArea: "main", paddingLeft: PAD }} data-column="main">
        <FoundationSectionList data={data} sections={main} options={{ heading: { variant: "underline" } }} />
      </main>
    </FoundationPage>
  );
}
