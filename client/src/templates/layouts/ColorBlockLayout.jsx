import { foundationVars } from "../foundation/tokens";
import { ContactList, FoundationPage, FoundationSections } from "../foundation/components";
import { WithPhoto } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Color Block (design foundation): confident geometric blocks frame the page. The header is two
// blocks side by side (the name in white on the accent, the contact details on a pale tint),
// every page ends on a solid accent band, and high-contrast black headings are marked with a
// solid accent square. Body text stays on plain white.
// Full bleed: the blocks reach the page edges, so this layout applies the page margins itself
// (pages 2, 3... get their top margin from templates/pagination.js).

const VARS = foundationVars(
  { headline: 12, heading: 11.5, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 },
  { section: 24, heading: 8, item: 12, bullet: 4 }
);
const BAND = "5mm"; // The accent band at the foot of every page

export default function ColorBlockLayout({ data }) {
  return (
    <FoundationPage
      vars={VARS}
      fill
      style={{
        // Repeated once per page (--page-height comes from ResumeSheet)
        backgroundImage: `linear-gradient(to top, var(--accent) 0 ${BAND}, transparent ${BAND} 100%)`,
        backgroundSize: "100% var(--page-height, 297mm)",
        backgroundRepeat: "repeat-y",
      }}
    >
      {/* Name first, then the contact details, in the page source as on the page */}
      <header className="grid grid-cols-[minmax(0,64fr)_minmax(0,36fr)]" data-block>
        <div className="f-on-accent bg-(--accent) pt-[32pt] pr-[16pt] pb-[24pt] pl-(--m-left)" style={HEADER_ALIGN}>
          <WithPhoto photo={data.photo} align={data.headerAlign} defaultBorderColor="var(--on-accent)">
            <h1 className="f-name">{data.name}</h1>
            {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
          </WithPhoto>
        </div>
        <div className="flex flex-col justify-end bg-(--soft) pt-[32pt] pr-(--m-right) pb-[24pt] pl-[16pt]">
          <ContactList contacts={data.contacts} className="text-(--text)" />
        </div>
      </header>

      <div className="pr-(--m-right) pb-[calc(var(--m-bottom)+5mm)] pl-(--m-left)">
        <FoundationSections data={data} heading={{ variant: "block" }} />
      </div>
    </FoundationPage>
  );
}
