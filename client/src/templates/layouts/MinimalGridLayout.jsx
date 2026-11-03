import { foundationVars } from "../foundation/tokens";
import { ContactLine, FoundationPage, FoundationSections } from "../foundation/components";
import { Photo, WithPhoto } from "./shared";
import { HEADER_ALIGN, sectionNumbers, splitSections } from "./sectionLayout";

// Minimal Grid (design foundation): Swiss-style. A strict grid with a wide left gutter that
// holds an oversized section number ("01", "02"...) beside each heading, all content in one
// column to its right, and lots of white space. The numbers are drawn strokes in the accent
// (the layout's one use of it), so the heading an ATS reads is just "Experience".
// The header sits on the same grid: the photo (if any) in the gutter, the name and contact
// details lined up with the headings and content.
// With two columns (Design tab) there's no room for the gutter: the numbers sit, smaller,
// right before each heading, and the header is a plain one.

const VARS = foundationVars(
  { name: 30, headline: 12, heading: 11.5, jobTitle: 10.5, meta: 9.5, nameLineHeight: 1.1 },
  { section: 24, heading: 12, item: 12, bullet: 4 }
);
const GUTTER = "30mm";

export default function MinimalGridLayout({ data }) {
  const gutter = !splitSections(data).twoColumns;
  const options = {
    heading: { variant: "plain", numberHeight: gutter ? "26pt" : "16pt" },
    numbers: sectionNumbers(data),
    bodyClassName: "f-gutter-body",
  };

  return (
    <FoundationPage vars={VARS} className={gutter ? "f-gutter" : ""} style={{ "--grid-gutter": gutter ? GUTTER : "0px" }}>
      {gutter ? (
        <header className="grid items-start" style={{ gridTemplateColumns: `${GUTTER} minmax(0, 1fr)` }} data-block>
          <div>{data.photo && <Photo photo={{ ...data.photo, sizeMm: Math.min(data.photo.sizeMm, 24) }} />}</div>
          <div style={HEADER_ALIGN}>
            <h1 className="f-name">{data.name}</h1>
            {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
            <ContactLine contacts={data.contacts} className="mt-[12pt]" />
          </div>
        </header>
      ) : (
        <header style={HEADER_ALIGN} data-block>
          <WithPhoto photo={data.photo} align={data.headerAlign}>
            <h1 className="f-name">{data.name}</h1>
            {data.headline && <p className="f-headline mt-[4pt]">{data.headline}</p>}
            <ContactLine contacts={data.contacts} className="mt-[12pt]" />
          </WithPhoto>
        </header>
      )}

      <FoundationSections data={data} {...options} />
    </FoundationPage>
  );
}
