/**
 * Splits line items into page-sized chunks so the PDF can render a real repeating table
 * header on every page (react-pdf has no CSS `table-header-group` equivalent — the only
 * way to guarantee the header row reappears on each page is to build the pages by hand).
 *
 * Packs by *estimated rendered height in points*, not a fixed row count — a first attempt
 * at fixed "N rows per page" broke on real invoices with wildly variable description
 * lengths (some one line, some wrapping to 2-3), where a handful of long rows on one page
 * would silently overflow while short-row pages had room to spare. Height budgets (in pt)
 * for four tiers, since how much room is available depends on both "does this page carry
 * the full letterhead or just the small running header" AND "does this page also need to
 * reserve room below the table for the totals box":
 *   - single: page 1 AND the only page (full letterhead + totals both present)
 *   - first: page 1, but more pages follow (full letterhead, no totals)
 *   - last: a continuation page that's also the final page (running header + totals)
 *   - mid: a continuation page with more pages still to come (running header only)
 *
 * If a single row's own estimated height exceeds a page's entire budget (pathological
 * long description), it still gets its own page rather than being dropped — and if the
 * height estimate is wrong in practice, react-pdf's own automatic pagination is the
 * safety net; it just won't carry the running header/repeated table header onto that
 * extra page.
 */
export function paginateLinesByHeight<T>(
  lines: T[],
  opts: {
    rowHeight: (line: T) => number;
    budgets: { single: number; first: number; mid: number; last: number };
  }
): T[][] {
  if (lines.length === 0) return [[]];

  const heights = lines.map(opts.rowHeight);
  const pages: T[][] = [];
  let index = 0;
  let isFirst = true;

  while (index < lines.length) {
    const remainingTotal = heights.slice(index).reduce((sum, h) => sum + h, 0);
    const budget = isFirst
      ? remainingTotal <= opts.budgets.first
        ? opts.budgets.single
        : opts.budgets.first
      : remainingTotal <= opts.budgets.mid
        ? opts.budgets.last
        : opts.budgets.mid;

    let used = 0;
    let end = index;
    while (end < lines.length && used + heights[end] <= budget) {
      used += heights[end];
      end++;
    }
    if (end === index) end = index + 1; // always make progress, even if one row exceeds budget

    pages.push(lines.slice(index, end));
    index = end;
    isFirst = false;
  }

  return pages;
}
