// Helvetica isn't monospace, so this is a deliberately conservative average
// character-width estimate (points per character, as a multiple of font size) used to
// predict text wrapping without an actual font metrics table. Biased toward predicting
// *more* wrapping than reality — overestimating a row's height just leaves a little extra
// whitespace at the bottom of a page; underestimating is what caused real overflow (an
// unplanned extra page without the running header, or a stray near-blank page) when
// row-height assumptions didn't hold for long/wrapped descriptions.
const AVG_CHAR_WIDTH_FACTOR = 0.56;

export function estimateTextLines(text: string, columnWidthPt: number, fontSizePt: number): number {
  if (!text) return 1;
  const avgCharWidth = fontSizePt * AVG_CHAR_WIDTH_FACTOR;
  const charsPerLine = Math.max(1, Math.floor(columnWidthPt / avgCharWidth));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}
