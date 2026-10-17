// Splits a resume into A4 pages, the same way for the on-screen preview and the PDF.
//
// How it works:
//   1. Layouts mark every piece that must not be split across pages with `data-block`
//      (a heading, a job's title line, one bullet point, an education entry...).
//      Headings and job titles also get `data-keep` so they stay with the next block.
//      Two-column layouts add `data-flow="side"` (or "all" for full-width parts above the columns).
//   2. paginate() measures the blocks on the full-length (hidden) resume.
//   3. Any block that would cross the bottom of a page gets extra top padding (a "gap")
//      that moves it to the top of the next page.
//   4. applyGaps() adds the same padding to the printed sheet and to every visible page.

const MM = 96 / 25.4; // CSS pixels per millimetre
export const PAGE_HEIGHT = 297 * MM; // A4
const PAGE_MARGIN = 14 * MM; // Empty space at the bottom of each page and the top of pages 2, 3...
const USABLE_HEIGHT = PAGE_HEIGHT - 2 * PAGE_MARGIN;

// Removes gaps from earlier runs, so we measure the natural layout
function clearGaps(container) {
  for (const el of container.querySelectorAll("[data-block]")) {
    el.style.paddingTop = "";
    el.style.removeProperty("--gap");
  }
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

// Works out the gaps and the number of pages for a rendered resume sheet
export function paginate(sheet) {
  clearGaps(sheet);

  const sheetTop = sheet.getBoundingClientRect().top;
  const blocks = [...sheet.querySelectorAll("[data-block]")].map((el, index) => {
    const rect = el.getBoundingClientRect();
    return {
      index,
      flow: el.dataset.flow ?? "main",
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
    const pageLimit = (page + 1) * PAGE_HEIGHT - PAGE_MARGIN;
    const height = current.bottom - current.top;

    // Crosses the bottom of the page (and is small enough to fit on a page by itself)?
    if (current.bottom > pageLimit && height <= USABLE_HEIGHT) {
      // Move the block - together with any "keep with next" blocks just above it on the
      // same page (e.g. its section heading) - to the top of the next page
      const column = placed[flow];
      let firstToMove = column.length;
      while (firstToMove > 0) {
        const previous = column[firstToMove - 1];
        const isAtPageTop = previous.top <= page * PAGE_HEIGHT + PAGE_MARGIN + 1;
        if (!previous.keepWithNext || Math.floor(previous.top / PAGE_HEIGHT) !== page || isAtPageTop) break;
        firstToMove -= 1;
      }

      const target = firstToMove < column.length ? column[firstToMove] : current;
      const gap = (page + 1) * PAGE_HEIGHT + PAGE_MARGIN - target.top;
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
