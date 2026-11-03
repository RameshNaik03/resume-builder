// Splits a resume into pages (A4 or US Letter), the same way for the on-screen preview and the PDF.
//
// How it works:
//   1. Layouts mark every piece that must not be split across pages with `data-block`
//      (a heading, a job's title line, one bullet point, an education entry...).
//      Headings and job titles also get `data-keep` so they stay with the next block.
//      Lists get orphan/widow control automatically (see keepsWithNext): a page never starts
//      or ends with a single item of a list, and a job title stays with its first two bullets.
//      Two-column layouts add `data-flow="side"` (or "all" for full-width parts above the columns),
//      either on each block or once on a column wrapper as `data-column="side"`.
//   2. paginate() measures the blocks on the full-length (hidden) resume.
//   3. Any block that would cross the bottom of a page gets extra top padding (a "gap")
//      that moves it to the top of the next page.
//   4. applyGaps() adds the same padding to the printed sheet and to every visible page.
//   5. pageDecorations() then measures the paginated sheet for decorations that must respect
//      page breaks, and applyDecorations() copies them to every visible page (see below).
// Page height and margins come from the resume's design (see pageMetrics in design.js).

// Removes gaps and decorations from earlier runs, so we measure the natural layout
function clearGaps(container) {
  for (const el of container.querySelectorAll("[data-block]")) {
    el.style.paddingTop = "";
    el.style.removeProperty("--gap");
  }
  applyDecorations(container, { segments: [] });
}

// gaps[i] is the extra space (px) before the i-th [data-block] element
export function applyGaps(container, gaps) {
  container.querySelectorAll("[data-block]").forEach((el, index) => {
    const gap = gaps[index];
    el.style.paddingTop = gap ? `${gap}px` : "";
    // Lets absolutely positioned decorations (e.g. timeline dots) move down too
    if (gap) el.style.setProperty("--gap", `${gap}px`);
    else el.style.removeProperty("--gap");
  });
}

// Whether a block must stay on the same page as the block after it: headings, job titles and
// anything else marked data-keep, plus orphan/widow control for lists. In a list of block <li>s,
// the first item stays with the second and the second-to-last with the last, so a list split
// across pages always has at least two items on each side (a three-item list stays whole).
// With the job title's own data-keep, a title also stays with its first two bullets.
function keepsWithNext(el) {
  if (el.dataset.keep === "true") return true;
  if (el.tagName !== "LI") return false;
  const items = [...el.parentElement.children].filter((item) => item.hasAttribute("data-block"));
  const position = items.indexOf(el);
  return items.length >= 2 && (position === 0 || position === items.length - 2);
}

// Works out the gaps and the number of pages for a rendered resume sheet.
//   heightPx       - page height
//   marginTopPx    - empty space at the top of pages 2, 3... (page 1 has the layout's own padding)
//   marginBottomPx - empty space at the bottom of every page
export function paginate(sheet, { heightPx: PAGE_HEIGHT, marginTopPx: MARGIN_TOP, marginBottomPx: MARGIN_BOTTOM }) {
  const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  clearGaps(sheet);

  const sheetTop = sheet.getBoundingClientRect().top;
  const blocks = [...sheet.querySelectorAll("[data-block]")].map((el, index) => {
    const rect = el.getBoundingClientRect();
    return {
      index,
      // A block's column: its own data-flow, or the data-column it sits in
      flow: el.dataset.flow ?? el.closest("[data-column]")?.dataset.column ?? "main",
      keepWithNext: keepsWithNext(el),
      top: rect.top - sheetTop,
      bottom: rect.bottom - sheetTop,
    };
  });

  const gaps = [];
  const shift = { all: 0, main: 0, side: 0 }; // How far each column has been pushed down so far
  const placed = { all: [], main: [], side: [] }; // Blocks already positioned, per column
  let lowestBottom = 0;

  for (const block of blocks) {
    const flow = block.flow in shift ? block.flow : "main";
    const offset = shift.all + (flow === "all" ? 0 : shift[flow]);
    const current = { ...block, top: block.top + offset, bottom: block.bottom + offset };

    const page = Math.floor(current.top / PAGE_HEIGHT);
    const pageLimit = (page + 1) * PAGE_HEIGHT - MARGIN_BOTTOM;
    const height = current.bottom - current.top;

    // Crosses the bottom of the page (and is small enough to fit on a page by itself)?
    if (current.bottom > pageLimit && height <= USABLE_HEIGHT) {
      // Move the block - together with any "keep with next" blocks just above it on the
      // same page (e.g. its section heading) - to the top of the next page
      const column = placed[flow];
      let firstToMove = column.length;
      while (firstToMove > 0) {
        const previous = column[firstToMove - 1];
        const isAtPageTop = previous.top <= page * PAGE_HEIGHT + MARGIN_TOP + 1;
        if (!previous.keepWithNext || Math.floor(previous.top / PAGE_HEIGHT) !== page || isAtPageTop) break;
        firstToMove -= 1;
      }

      const target = firstToMove < column.length ? column[firstToMove] : current;
      const gap = (page + 1) * PAGE_HEIGHT + MARGIN_TOP - target.top;
      gaps[target.index] = (gaps[target.index] ?? 0) + gap;

      for (const moved of column.slice(firstToMove)) {
        moved.top += gap;
        moved.bottom += gap;
      }
      current.top += gap;
      current.bottom += gap;
      shift[flow] += gap;
    }

    placed[flow].push(current);
    lowestBottom = Math.max(lowestBottom, current.bottom);
  }

  const pageCount = Math.max(1, Math.floor(lowestBottom / PAGE_HEIGHT) + 1);
  return { gaps, pageCount };
}

// ---------- Decorations that respect page breaks ----------
//
// data-segmented: an element whose background (a card's tint, a timeline's line, a column rule)
//   would otherwise run straight through the page margins at a page break. Per page, its
//   background is drawn from its first block's top to its last block's bottom on that page,
//   plus data-seg-pad points of padding. The result is set as the --seg-image variable (a
//   vertical gradient in var(--seg-color)); the element's CSS uses it as its background
//   image, falling back to a solid background when it isn't paginated (thumbnails).
//   data-seg-columns: only pages where at least two of the element's columns ([data-column])
//   have content get a segment (a column rule never runs beside an empty column).
//   An element inside marked data-seg-start (e.g. a timeline's first dot) makes the first
//   segment start at its vertical centre. With a background image set, --seg-y / --seg-h are
//   set to 0 / 100% so the element's CSS can position its unpaginated fallback differently.

const PT_TO_PX = 96 / 72;
const NOTHING = "linear-gradient(transparent, transparent)";

// Measures the decorations on a sheet whose gaps are already applied
export function pageDecorations(sheet, { heightPx: PAGE_HEIGHT }) {
  applyDecorations(sheet, { segments: [] });
  const sheetTop = sheet.getBoundingClientRect().top;
  const pageOf = (y) => Math.floor(y / PAGE_HEIGHT);

  const segments = [...sheet.querySelectorAll("[data-segmented]")].map((el) => {
    const rect = el.getBoundingClientRect();
    const top = rect.top - sheetTop;
    const bottom = rect.bottom - sheetTop;
    const pad = Number(el.dataset.segPad ?? 0) * PT_TO_PX;
    const needsColumns = "segColumns" in el.dataset;

    // The top (below any gap padding) and bottom of the blocks inside, and their columns, by page
    const pages = new Map();
    for (const block of el.querySelectorAll("[data-block]")) {
      const blockRect = block.getBoundingClientRect();
      const blockTop = blockRect.top - sheetTop + (parseFloat(block.style.paddingTop) || 0);
      const page = pageOf(blockTop);
      const range = pages.get(page) ?? { start: Infinity, end: -Infinity, columns: new Set() };
      range.start = Math.min(range.start, blockTop);
      range.end = Math.max(range.end, blockRect.bottom - sheetTop);
      range.columns.add(block.closest("[data-column]")?.dataset.column);
      pages.set(page, range);
    }
    const kept = [...pages.values()].filter((range) => !needsColumns || range.columns.size >= 2);
    if (kept.length === 0) return NOTHING;

    const startMark = el.querySelector("[data-seg-start]");
    // Entirely on one page (and no start mark), the element's own background is already right.
    // An element whose blocks all moved to the next page still starts on the page before, so
    // it needs a segment too (otherwise an empty tinted stub is left behind).
    const onePage = pages.size === 1 && pageOf(top) === pageOf(bottom - 1);
    if (onePage && !startMark) return "";

    const ranges = kept.map(({ start, end }) => [Math.max(top, start - pad) - top, Math.min(bottom, end + pad) - top]);
    if (startMark) {
      const markRect = startMark.getBoundingClientRect();
      ranges[0][0] = Math.max(ranges[0][0], (markRect.top + markRect.bottom) / 2 - sheetTop - top);
    }
    const stops = ranges.flatMap(([start, end], index) => {
      const previousEnd = index === 0 ? 0 : ranges[index - 1][1];
      return [`transparent ${previousEnd}px ${start}px`, `var(--seg-color) ${start}px ${end}px`];
    });
    return `linear-gradient(to bottom, ${stops.join(", ")}, transparent ${ranges.at(-1)[1]}px)`;
  });

  return { segments };
}

// Applies measured decorations (in the same order) to the sheet or a visible page copy
export function applyDecorations(container, { segments }) {
  container.querySelectorAll("[data-segmented]").forEach((el, index) => {
    for (const [name, value] of [["--seg-image", segments[index]], ["--seg-y", "0px"], ["--seg-h", "100%"]]) {
      if (segments[index]) el.style.setProperty(name, value);
      else el.style.removeProperty(name);
    }
  });
}
