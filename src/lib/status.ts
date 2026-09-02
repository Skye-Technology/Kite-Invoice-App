import Decimal from "decimal.js";
import type { InvoiceStatus, ExpenseStatus, QuotationStatus } from "@prisma/client";

/**
 * Derives invoice status from balance and due date. DRAFT and CANCELLED are only ever set
 * explicitly (never derived here) — this only decides between SENT/PAID/PARTIALLY_PAID/OVERDUE.
 */
export function deriveInvoiceStatus(params: {
  currentStatus: InvoiceStatus;
  totalAmount: Decimal | number | string;
  amountPaid: Decimal | number | string;
  dueDate: Date;
}): InvoiceStatus {
  if (params.currentStatus === "DRAFT" || params.currentStatus === "CANCELLED") {
    return params.currentStatus;
  }

  const total = new Decimal(params.totalAmount);
  const paid = new Decimal(params.amountPaid);

  if (paid.gte(total) && total.gt(0)) return "PAID";
  if (paid.gt(0)) return "PARTIALLY_PAID";
  if (params.dueDate.getTime() < Date.now()) return "OVERDUE";
  return "SENT";
}

export function deriveExpenseStatus(params: {
  currentStatus: ExpenseStatus;
  totalAmount: Decimal | number | string;
  amountPaid: Decimal | number | string;
  dueDate: Date | null;
}): ExpenseStatus {
  if (params.currentStatus === "REIMBURSABLE") return params.currentStatus;

  const total = new Decimal(params.totalAmount);
  const paid = new Decimal(params.amountPaid);

  if (paid.gte(total) && total.gt(0)) return "PAID";
  if (params.dueDate && params.dueDate.getTime() < Date.now() && paid.lt(total)) return "OVERDUE";
  return "PENDING";
}

/**
 * A SENT quotation flips to EXPIRED once past its valid-until date. Every other status
 * (DRAFT, ACCEPTED, DECLINED, CONVERTED) is only ever set explicitly.
 */
export function deriveQuotationStatus(params: {
  currentStatus: QuotationStatus;
  validUntilDate: Date;
}): QuotationStatus {
  if (params.currentStatus !== "SENT") return params.currentStatus;
  if (params.validUntilDate.getTime() < Date.now()) return "EXPIRED";
  return "SENT";
}
