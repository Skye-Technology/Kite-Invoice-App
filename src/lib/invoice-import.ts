import ExcelJS from "exceljs";
import Decimal from "decimal.js";

export type HistoricalInvoiceRow = {
  rowNumber: number;
  invoiceNumber: string;
  customerName: string;
  issueDate: string; // ISO yyyy-mm-dd
  dueDate: string | null; // ISO yyyy-mm-dd, or null if the file has no Due Date column —
  // the caller should fall back to the customer's own payment terms, not just the issue date.
  currency: string;
  totalAmount: string;
  subtotal: string;
  taxTotal: string;
  amountPaid: string;
  status: "DRAFT" | "SENT" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED" | null;
};

const EXPLICIT_STATUSES = new Set(["DRAFT", "CANCELLED"]);

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value.trim());
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Parses a spreadsheet of historical invoices (e.g. exported from a prior system) into
 * lightweight import rows — just the record-keeping fields, no line items. Column matching
 * accepts a few aliases per field to cover both a generic "Invoice Number/Issue Date/Total/
 * Amount Paid" header row and Gekko's actual export headers ("Invoice number"/"Date invoice"/
 * "Total amount"/"Bank transaction" — Gekko has no Amount Paid column, but its "Bank
 * transaction" figure is the amount actually settled, 0 when unpaid). Only invoice number /
 * customer / issue date / total are required; due date is left null when the file has no Due
 * Date column (Gekko doesn't export one) so the caller can derive it from the customer's own
 * payment terms rather than wrongly defaulting to the issue date itself; currency defaults to
 * `defaultCurrency` (also not in Gekko's export — it invoices everything in the company's home
 * currency); amount paid defaults to 0; and status — unless explicitly DRAFT or CANCELLED — is
 * left null so the caller derives it from amountPaid/dueDate instead of trusting a free-text
 * column (Gekko's "Sent"/"Paid" wording doesn't match this app's enum). VAT breakdown — Gekko
 * exports "Total net"/"VAT total" — is read when present; otherwise subtotal defaults to the
 * total (0 tax), same as a plain non-VAT record.
 */
export async function parseHistoricalInvoicesXlsx(
  buffer: Buffer,
  defaultCurrency: string
): Promise<{
  rows: HistoricalInvoiceRow[];
  errors: { rowNumber: number; message: string }[];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("No worksheet found in the uploaded file.");

  const headerRow = sheet.getRow(1).values as unknown[];
  const columnIndex = (...labels: string[]) =>
    headerRow.findIndex(
      (h) => typeof h === "string" && labels.some((label) => h.trim().toLowerCase() === label.toLowerCase())
    );

  const numberCol = columnIndex("Invoice Number", "Invoice number");
  const customerCol = columnIndex("Customer");
  const issueDateCol = columnIndex("Issue Date", "Date invoice");
  const dueDateCol = columnIndex("Due Date");
  const currencyCol = columnIndex("Currency");
  const totalCol = columnIndex("Total", "Total amount");
  const subtotalCol = columnIndex("Subtotal", "Total net");
  const taxCol = columnIndex("VAT", "Tax", "VAT total");
  const paidCol = columnIndex("Amount Paid", "Bank transaction");
  const statusCol = columnIndex("Status");

  if ([numberCol, customerCol, issueDateCol, totalCol].some((i) => i < 0)) {
    throw new Error(
      "Unrecognized format — expected columns: Invoice Number, Customer, Issue Date, Total (Due Date, Currency, Amount Paid, Status are optional)."
    );
  }

  const rows: HistoricalInvoiceRow[] = [];
  const errors: { rowNumber: number; message: string }[] = [];

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex).values as unknown[];
    const invoiceNumber = String(row[numberCol] ?? "").trim();
    const customerName = String(row[customerCol] ?? "").trim();
    if (!invoiceNumber && !customerName) continue; // blank row

    if (!invoiceNumber) {
      errors.push({ rowNumber: rowIndex, message: "Missing invoice number." });
      continue;
    }
    if (!customerName) {
      errors.push({ rowNumber: rowIndex, message: "Missing customer name." });
      continue;
    }

    const issueDate = toIsoDate(row[issueDateCol]);
    if (!issueDate) {
      errors.push({ rowNumber: rowIndex, message: "Missing or invalid issue date." });
      continue;
    }

    const currencyRaw = currencyCol >= 0 ? String(row[currencyCol] ?? "").trim() : "";
    const currency = (currencyRaw || defaultCurrency).toUpperCase();
    if (currency.length !== 3) {
      errors.push({ rowNumber: rowIndex, message: `Invalid currency "${currency}".` });
      continue;
    }

    const totalRaw = row[totalCol];
    let totalAmount: Decimal;
    try {
      totalAmount = new Decimal(String(totalRaw ?? "").trim() || "0");
    } catch {
      errors.push({ rowNumber: rowIndex, message: `Invalid total "${totalRaw}".` });
      continue;
    }
    if (totalAmount.lte(0)) {
      errors.push({ rowNumber: rowIndex, message: "Total must be greater than zero." });
      continue;
    }

    let subtotal: Decimal | null = null;
    if (subtotalCol >= 0 && row[subtotalCol] != null && String(row[subtotalCol]).trim() !== "") {
      try {
        subtotal = new Decimal(String(row[subtotalCol]).trim());
      } catch {
        errors.push({ rowNumber: rowIndex, message: `Invalid subtotal "${row[subtotalCol]}".` });
        continue;
      }
    }
    let taxTotal: Decimal | null = null;
    if (taxCol >= 0 && row[taxCol] != null && String(row[taxCol]).trim() !== "") {
      try {
        taxTotal = new Decimal(String(row[taxCol]).trim());
      } catch {
        errors.push({ rowNumber: rowIndex, message: `Invalid VAT total "${row[taxCol]}".` });
        continue;
      }
    }
    // Only one of the two given: derive the other from the total rather than dropping it.
    if (subtotal === null && taxTotal !== null) subtotal = totalAmount.minus(taxTotal);
    if (taxTotal === null && subtotal !== null) taxTotal = totalAmount.minus(subtotal);
    if (subtotal === null) subtotal = totalAmount;
    if (taxTotal === null) taxTotal = new Decimal(0);

    const dueDate = dueDateCol >= 0 ? toIsoDate(row[dueDateCol]) : null;

    let amountPaid = new Decimal(0);
    if (paidCol >= 0 && row[paidCol] != null && String(row[paidCol]).trim() !== "") {
      try {
        amountPaid = new Decimal(String(row[paidCol]).trim());
      } catch {
        errors.push({ rowNumber: rowIndex, message: `Invalid amount paid "${row[paidCol]}".` });
        continue;
      }
    }

    const statusRaw =
      statusCol >= 0 ? String(row[statusCol] ?? "").trim().toUpperCase() : "";
    const status = EXPLICIT_STATUSES.has(statusRaw) ? (statusRaw as "DRAFT" | "CANCELLED") : null;

    rows.push({
      rowNumber: rowIndex,
      invoiceNumber,
      customerName,
      issueDate,
      dueDate,
      currency,
      totalAmount: totalAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      status,
    });
  }

  return { rows, errors };
}
