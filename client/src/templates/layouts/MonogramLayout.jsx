import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { DrawnText } from "../foundation/glyphs";
import { Photo } from "./shared";
import { HEADER_ALIGN } from "./sectionLayout";

// Monogram (design foundation): refined and quiet. A two-tone header (the name on the accent,
// the contact details on a pale tint below it) led by a large initials badge, then serif
// headings with a small diamond. The badge's initials are drawn strokes (an SVG shape), so an
// ATS never reads them as text. With a photo, the photo takes the badge's place.
// Full bleed: the header bands reach the page edges, so this layout applies the page margins
// itself (pages 2, 3... get their top margin from templates/pagination.js).

const VARS = foundationVars(
  { headline: 12, heading: 11.5, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 },
  { section: 24, heading: 8, item: 16, bullet: 4 }
);

// "Priya Raman" -> "PR"; "Madonna" -> "M"
const initialsOf = (name) => {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words[0][0] + words.at(-1)[0] : (words[0]?.[0] ?? "");
};

// A circle with a fine double ring around drawn initials
function Badge({ name }) {
  return (
    <div className="grid size-[22mm] shrink-0 place-items-center rounded-full border-[0.75pt] border-current p-[2pt]" aria-hidden="true">
      <div className="grid size-full place-items-center rounded-full border-[0.75pt] border-current">
        <DrawnText text={initialsOf(name)} height="8mm" weight={0.7} />
      </div>
    </div>
  );
}

export default function MonogramLayout({ data }) {
  const mark = data.photo ? <Photo photo={data.photo} defaultBorderColor="var(--on-accent)" /> : <Badge name={data.name} />;
  const centred = data.headerAlign === "center";

  return (
    <FoundationPage vars={VARS}>
      <header data-block>
        <div
          className={`f-on-accent bg-(--accent) pt-[32pt] pr-(--m-right) pb-[24pt] pl-(--m-left) ${
            centred ? "flex flex-col items-center gap-[12pt]" : `flex items-center gap-[8mm] ${data.headerAlign === "right" ? "flex-row-reverse" : ""}`
          }`}
          style={HEADER_ALIGN}
        >
          {mark}
          <div className="min-w-0">
            <h1 className="f-name font-semibold">{data.name}</h1>
            {data.headline && <p className="f-headline mt-[4pt] font-heading italic">{data.headline}</p>}
          </div>
        </div>
        {data.contacts.length > 0 && (
          <div className="bg-(--soft) py-[12pt] pr-(--m-right) pl-(--m-left)" style={HEADER_ALIGN}>
            <ContactLine contacts={data.contacts} />
          </div>
        )}
      </header>

      <div className="pr-(--m-right) pb-(--m-bottom) pl-(--m-left)">
        <FoundationSections data={data} heading={{ variant: "ornament", caps: false }} />
      </div>
    </FoundationPage>
  );
}
