// Splits a resume into pages (A4 or US Letter), the same way for the on-screen preview and the PDF.
//
// How it works:
//   1. Layouts mark every piece that must not be split across pages with `data-block`
//      (a heading, a job's title line, one bullet point, an education entry...).
//      Headings and job titles also get `data-keep` so they stay with the next block.
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
  applyDecorations(container, { fills: [], segments: [] });
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
      keepWithNext: el.dataset.keep === "true",
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
// data-fill-page: an element (e.g. the side column of two columns, which carries the column
//   divider) that grows to the bottom margin of the last page its own content reaches, and
//   no further, so its divider never runs on past the content into an empty next page.
//   It must not stretch by itself (use align-self: start in a grid).
//
// data-segmented: an element whose background (a card's tint, a timeline's line) would
//   otherwise run straight through the page margins at a page break. Per page, its
//   background is drawn from its first block's top to its last block's bottom on that page,
//   plus data-seg-pad points of padding. The result is set as the --seg-image variable (a
//   vertical gradient in var(--seg-color)); the element's CSS uses it as its background
//   image, falling back to a solid background when it isn't paginated (thumbnails).
//   An element inside marked data-seg-start (e.g. a timeline's first dot) makes the first
//   segment start at its vertical centre. With a background image set, --seg-y / --seg-h are
//   set to 0 / 100% so the element's CSS can position its unpaginated fallback differently.

const PT_TO_PX = 96 / 72;

// Measures the decorations on a sheet whose gaps are already applied
export function pageDecorations(sheet, { heightPx: PAGE_HEIGHT, marginBottomPx: MARGIN_BOTTOM }) {
  applyDecorations(sheet, { fills: [], segments: [] });
  const sheetTop = sheet.getBoundingClientRect().top;
  const pageOf = (y) => Math.floor(y / PAGE_HEIGHT);

  const fills = [...sheet.querySelectorAll("[data-fill-page]")].map((el) => {
    const rect = el.getBoundingClientRect();
    const top = rect.top - sheetTop;
    const lastPage = pageOf(rect.bottom - sheetTop - 1);
    return Math.max(0, (lastPage + 1) * PAGE_HEIGHT - MARGIN_BOTTOM - top);
  });

  const segments = [...sheet.querySelectorAll("[data-segmented]")].map((el) => {
    const rect = el.getBoundingClientRect();
    const top = rect.top - sheetTop;
    const bottom = rect.bottom - sheetTop;
    const pad = Number(el.dataset.segPad ?? 0) * PT_TO_PX;

    // The top (below any gap padding) and bottom of each block inside, grouped by page
    const pages = new Map();
    for (const block of el.querySelectorAll("[data-block]")) {
      const blockRect = block.getBoundingClientRect();
      const blockTop = blockRect.top - sheetTop + (parseFloat(block.style.paddingTop) || 0);
      const blockBottom = blockRect.bottom - sheetTop;
      const page = pageOf(blockTop);
      const range = pages.get(page) ?? { start: Infinity, end: -Infinity };
      pages.set(page, { start: Math.min(range.start, blockTop), end: Math.max(range.end, blockBottom) });
    }
    const startMark = el.querySelector("[data-seg-start]");
    // Entirely on one page (and no start mark), the element's own background is already right.
    // An element whose blocks all moved to the next page still starts on the page before, so
    // it needs a segment too (otherwise an empty tinted stub is left behind).
    const onePage = pages.size === 1 && pageOf(top) === pageOf(bottom - 1);
    if (pages.size === 0 || (onePage && !startMark)) return "";

    const ranges = [...pages.values()].map(({ start, end }) => [Math.max(top, start - pad) - top, Math.min(bottom, end + pad) - top]);
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

  return { fills, segments };
}

// Applies measured decorations (in the same order) to the sheet or a visible page copy
export function applyDecorations(container, { fills, segments }) {
  container.querySelectorAll("[data-fill-page]").forEach((el, index) => {
    el.style.minHeight = fills[index] ? `${fills[index]}px` : "";
  });
  container.querySelectorAll("[data-segmented]").forEach((el, index) => {
    for (const [name, value] of [["--seg-image", segments[index]], ["--seg-y", "0px"], ["--seg-h", "100%"]]) {
      if (segments[index]) el.style.setProperty(name, value);
      else el.style.removeProperty(name);
    }
  });
}
