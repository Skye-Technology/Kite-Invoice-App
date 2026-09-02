import { StyleSheet } from "@react-pdf/renderer";

// Color tokens and spacing values ported directly from docs/invoice-template.html (its CSS
// px values × 0.75 = pt; its @page mm margins × 2.8346 = pt), so the PDF matches that
// reference design at the actual layout level, not just visually approximated. Font stays
// Helvetica (react-pdf's reliable built-in) rather than Inter — Google Fonts now only
// serves Inter as a variable font, which react-pdf's font engine can't reliably split into
// distinct static weights.
export const colors = {
  ink: "#1c1c22",
  muted: "#6c7280",
  faint: "#9aa0ab",
  border: "#e6e7eb",
  headerBg: "#f4f4f6",
  rowAlt: "#fafafb",
  accent: "#2f5cf0",
};

// The template's paginated @page margin (24mm 16mm 20mm 16mm) — used on every page,
// including page 1: only the running-header *content* is suppressed on page 1
// (@page :first { content: none }), the margin box itself is the same throughout.
export const PAGE_MARGIN = { top: 68, bottom: 57, left: 45 };

export const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_MARGIN.top,
    paddingBottom: PAGE_MARGIN.bottom,
    paddingHorizontal: PAGE_MARGIN.left,
    fontSize: 9.5,
    color: colors.ink,
    fontFamily: "Helvetica",
  },

  // Old single-page layout, still used by quotation/expense PDFs pending their own
  // redesign to match docs/invoice-template.html (deferred until the invoice design
  // itself is confirmed) — kept only so those templates keep compiling.
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  // ---- doc-header: logo (left) / company block (right) — page 1 only ----
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25.5,
  },
  logo: { maxWidth: 150, maxHeight: 40, objectFit: "contain" },

  companyBlock: { alignItems: "flex-end" },
  companyName: {
    fontSize: 11.5,
    fontWeight: 700,
    marginBottom: 2,
    textAlign: "right",
  },
  companyLine: {
    color: colors.muted,
    fontSize: 9.5,
    textAlign: "right",
    lineHeight: 1.55,
  },

  // ---- bill-to block — its own section, not paired side-by-side with anything ----
  billTo: { marginBottom: 0 },
  billToName: { fontSize: 10.5, fontWeight: 700, marginBottom: 3 },
  billToLine: { color: colors.muted, fontSize: 9.5, lineHeight: 1.55 },

  // ---- invoice-meta: number (left) / date block (right) — below bill-to ----
  parties: { marginBottom: 19.5 },
  invoiceMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 27,
  },
  docNumber: { fontSize: 11.5, fontWeight: 700 },
  dateBlock: { alignItems: "flex-end" },
  dateLine: { fontSize: 11.5, fontWeight: 700 },
  dateSubLine: { color: colors.muted, fontSize: 9, marginTop: 1.5 },

  // ---- running header (continuation pages only) ----
  // Normal document flow (not position: absolute) — deliberately, so it can't overlap the
  // table that follows it regardless of exact content height; a fixed page-top offset would
  // risk that since react-pdf's absolute-positioning-vs-page-padding interaction isn't
  // something to guess at without a way to visually verify the render.
  runningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  runningInvoice: { fontSize: 8.25, fontWeight: 700, color: colors.ink },
  runningCompany: { fontSize: 8.25, fontWeight: 700, color: colors.ink },

  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  muted: { color: colors.muted },
  section: { marginBottom: 20 },
  label: { color: colors.muted, fontSize: 8.25, marginBottom: 2 },
  value: { fontSize: 9.5, marginBottom: 8 },

  // ---- items table ----
  table: { marginTop: 3 },
  row: {
    flexDirection: "row",
    borderBottom: `1 solid ${colors.border}`,
    paddingVertical: 9,
    paddingHorizontal: 10.5,
  },
  headerRow: { backgroundColor: colors.headerBg, paddingVertical: 8.25 },
  zebraRow: { backgroundColor: colors.rowAlt },

  // Description gets the lion's share deliberately — a narrower column here risks
  // wrapping to two lines on realistic descriptions, silently making rows taller than
  // the pagination math in paginate.ts assumes.
  colQty: { flex: 0.7 },
  colDescription: { flex: 4.6 },
  colRate: { flex: 1.1, textAlign: "right" },
  colAmount: { flex: 1.1, textAlign: "right" },
  colTax: { flex: 0.7, textAlign: "right" },

  // ---- totals ----
  totals: { marginTop: 16.5, alignItems: "flex-end" },
  totalsRow: {
    flexDirection: "row",
    width: 195,
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10.5,
  },
  totalsLabel: { color: colors.muted },
  grandTotal: {
    fontWeight: 700,
    fontSize: 10.5,
    borderTop: `1 solid ${colors.border}`,
    marginTop: 1.5,
    paddingTop: 9,
  },

  // ---- notes / contract-style footer (flows once, wherever the last page lands) ----
  notesFooter: {
    marginTop: 30,
    fontSize: 8.6,
    color: colors.muted,
    lineHeight: 1.6,
  },

  // ---- per-page branding footer ----
  poweredBy: {
    position: "absolute",
    bottom: 22,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    fontSize: 7.9,
    color: colors.faint,
  },
  pageNumber: {
    position: "absolute",
    bottom: 22,
    right: PAGE_MARGIN.left,
    fontSize: 7.9,
    color: colors.faint,
  },
});
