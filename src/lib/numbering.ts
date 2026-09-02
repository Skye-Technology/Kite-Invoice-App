import { prisma } from "@/lib/prisma";

/**
 * Invoice numbers are year-based ("2026-0009"), not the configurable text prefix used for
 * expenses/quotations — matches the format already in use (migrated from Gekko). The
 * sequence itself is still just a running counter on Company, adjustable in Settings
 * (see setNextInvoiceNumber) so a migration can continue an existing external sequence
 * instead of restarting at 1.
 */
export async function nextInvoiceNumber(companyId: string) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { invoiceNumberSeq: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `${year}-${String(company.invoiceNumberSeq).padStart(4, "0")}`;
}

export async function nextExpenseNumber(companyId: string) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { expenseNumberSeq: { increment: 1 } },
  });
  return `${company.expensePrefix}-${String(company.expenseNumberSeq).padStart(4, "0")}`;
}

export async function nextQuotationNumber(companyId: string) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { quotationNumberSeq: { increment: 1 } },
  });
  return `${company.quotationPrefix}-${String(company.quotationNumberSeq).padStart(4, "0")}`;
}
