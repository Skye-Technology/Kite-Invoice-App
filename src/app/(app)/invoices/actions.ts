"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/current-company";
import { computeTotals, toDecimalString } from "@/lib/money";
import { nextInvoiceNumber } from "@/lib/numbering";
import { deriveInvoiceStatus } from "@/lib/status";
import { parseTimesheetXlsx, type TimesheetLine } from "@/lib/timesheet-import";
import { parseHistoricalInvoicesXlsx } from "@/lib/invoice-import";
import { addDays } from "@/lib/date";

const lineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive(),
  unitRate: z.coerce.number(),
  taxRate: z.coerce.number().min(0).max(1),
});

const invoiceSchema = z.object({
  companyId: z.string().min(1),
  customerId: z.string().min(1, "Choose a customer"),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: z.string().min(3).max(3),
  notes: z.string().optional(),
  reverseCharge: z.string().optional(),
  linesJson: z.string().min(1),
});

function parseInvoiceForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const base = invoiceSchema.parse(raw);

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(base.linesJson);
  } catch {
    throw new Error("Invalid line items.");
  }
  const lines = z.array(lineSchema).min(1, "At least one line item is required").parse(linesRaw);

  return { base, lines };
}

export async function createInvoice(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const { base, lines } = parseInvoiceForm(formData);
  await requireCompanyAccess(session.user.id, base.companyId);

  const { subtotal, taxTotal, totalAmount } = computeTotals(lines);
  const invoiceNumber = await nextInvoiceNumber(base.companyId);

  const invoice = await prisma.invoice.create({
    data: {
      companyId: base.companyId,
      customerId: base.customerId,
      invoiceNumber,
      issueDate: new Date(base.issueDate),
      dueDate: new Date(base.dueDate),
      currency: base.currency,
      status: "DRAFT",
      subtotal: toDecimalString(subtotal),
      taxTotal: toDecimalString(taxTotal),
      totalAmount: toDecimalString(totalAmount),
      balanceDue: toDecimalString(totalAmount),
      notes: base.notes || null,
      reverseCharge: base.reverseCharge === "on",
      lines: {
        create: lines.map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unitRate: line.unitRate,
          taxRate: line.taxRate,
          lineAmount: toDecimalString(new Decimal(line.quantity).times(line.unitRate)),
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const { base, lines } = parseInvoiceForm(formData);
  await requireCompanyAccess(session.user.id, base.companyId);

  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: base.companyId },
  });
  if (!existing) throw new Error("Invoice not found.");
  if (existing.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");

  const { subtotal, taxTotal, totalAmount } = computeTotals(lines);

  await prisma.$transaction([
    prisma.invoiceLine.deleteMany({ where: { invoiceId } }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        customerId: base.customerId,
        issueDate: new Date(base.issueDate),
        dueDate: new Date(base.dueDate),
        currency: base.currency,
        subtotal: toDecimalString(subtotal),
        taxTotal: toDecimalString(taxTotal),
        totalAmount: toDecimalString(totalAmount),
        balanceDue: toDecimalString(totalAmount),
        notes: base.notes || null,
        reverseCharge: base.reverseCharge === "on",
        lines: {
          create: lines.map((line, index) => ({
            description: line.description,
            quantity: line.quantity,
            unitRate: line.unitRate,
            taxRate: line.taxRate,
            lineAmount: toDecimalString(new Decimal(line.quantity).times(line.unitRate)),
            sortOrder: index,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

/**
 * Creates a new draft invoice by copying customer, currency, and line items from an
 * existing one, with fresh dates. A lightweight stand-in for recurring invoices — no
 * scheduler needed, just a one-click way to re-bill the same thing next period.
 */
export async function duplicateInvoice(invoiceId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const source = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { lines: { orderBy: { sortOrder: "asc" } }, customer: true },
  });
  if (!source) throw new Error("Invoice not found.");

  const invoiceNumber = await nextInvoiceNumber(companyId);
  const issueDate = new Date();
  const dueDate = new Date(
    issueDate.getTime() + source.customer.paymentTermsDays * 24 * 60 * 60 * 1000
  );

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      customerId: source.customerId,
      invoiceNumber,
      issueDate,
      dueDate,
      currency: source.currency,
      status: "DRAFT",
      subtotal: source.subtotal,
      taxTotal: source.taxTotal,
      totalAmount: source.totalAmount,
      balanceDue: source.totalAmount,
      notes: source.notes,
      reverseCharge: source.reverseCharge,
      lines: {
        create: source.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitRate: line.unitRate,
          taxRate: line.taxRate,
          lineAmount: line.lineAmount,
          sortOrder: line.sortOrder,
        })),
      },
    },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function deleteInvoice(invoiceId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be deleted.");

  await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/invoices");
}

export async function markInvoiceSent(invoiceId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be marked sent.");

  const status = deriveInvoiceStatus({
    currentStatus: "SENT",
    totalAmount: invoice.totalAmount,
    amountPaid: invoice.amountPaid,
    dueDate: invoice.dueDate,
  });

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function cancelInvoice(invoiceId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  await prisma.invoice.update({
    where: { id: invoiceId, companyId },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

const paymentSchema = z.object({
  companyId: z.string().min(1),
  invoiceId: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3),
  exchangeRate: z.coerce.number().positive(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordPaymentReceipt(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const raw = Object.fromEntries(formData.entries());
  const data = paymentSchema.parse(raw);
  await requireCompanyAccess(session.user.id, data.companyId);

  const invoice = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, companyId: data.companyId },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
    throw new Error("Invoice must be sent before recording a payment.");
  }

  const convertedAmount = new Decimal(data.amount).times(data.exchangeRate);
  const newAmountPaid = new Decimal(invoice.amountPaid).plus(convertedAmount);
  const newBalanceDue = new Decimal(invoice.totalAmount).minus(newAmountPaid);

  const status = deriveInvoiceStatus({
    currentStatus: invoice.status,
    totalAmount: invoice.totalAmount,
    amountPaid: newAmountPaid,
    dueDate: invoice.dueDate,
  });

  await prisma.$transaction([
    prisma.paymentReceipt.create({
      data: {
        companyId: data.companyId,
        invoiceId: data.invoiceId,
        paymentDate: new Date(data.paymentDate),
        amount: toDecimalString(data.amount),
        currency: data.currency,
        exchangeRate: data.exchangeRate,
        convertedAmount: toDecimalString(convertedAmount),
        paymentMethod: data.paymentMethod || null,
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
      },
    }),
    prisma.invoice.update({
      where: { id: data.invoiceId },
      data: {
        amountPaid: toDecimalString(newAmountPaid),
        balanceDue: toDecimalString(newBalanceDue),
        status,
      },
    }),
  ]);

  revalidatePath(`/invoices/${data.invoiceId}`);
  revalidatePath("/invoices");
}

const MAX_TIMESHEET_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Parses an uploaded timesheet .xlsx into candidate invoice lines — a preview step, not a
 * write. Nothing is persisted here; the caller (a client component) shows the results for
 * review/editing and only merges them into the invoice form's own line-item state.
 */
export async function parseTimesheetImport(
  companyId: string,
  formData: FormData
): Promise<TimesheetLine[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const file = formData.get("timesheet");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a timesheet file.");
  if (file.size > MAX_TIMESHEET_BYTES) throw new Error("Timesheet file must be under 5MB.");
  if (
    ![
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ].includes(file.type)
  ) {
    throw new Error("Timesheet must be an .xlsx file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return parseTimesheetXlsx(buffer);
}

const MAX_HISTORICAL_IMPORT_BYTES = 5 * 1024 * 1024; // 5MB

export type HistoricalImportResult = {
  imported: number;
  skipped: { rowNumber: number; invoiceNumber: string; message: string }[];
};

/**
 * Imports a spreadsheet of historical invoices as lightweight records — for keeping the
 * total/history on file, not full re-billable invoices: no line items, doesn't touch the
 * company's next-invoice-number sequence (the number comes from the spreadsheet), and each
 * row is created independently so one bad row (duplicate number, unknown format) doesn't
 * block the rest of the batch.
 */
export async function importHistoricalInvoices(
  companyId: string,
  formData: FormData
): Promise<HistoricalImportResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file.");
  if (file.size > MAX_HISTORICAL_IMPORT_BYTES) throw new Error("File must be under 5MB.");
  if (
    ![
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ].includes(file.type)
  ) {
    throw new Error(
      "File must be an .xlsx spreadsheet — if it's a legacy .xls export, open it in Excel/Sheets and re-save as .xlsx first."
    );
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, errors } = await parseHistoricalInvoicesXlsx(buffer, company.defaultCurrency);

  const skipped: HistoricalImportResult["skipped"] = errors.map((e) => ({
    rowNumber: e.rowNumber,
    invoiceNumber: "",
    message: e.message,
  }));
  let imported = 0;

  for (const row of rows) {
    try {
      let contact = await prisma.contact.findFirst({
        where: { companyId, name: { equals: row.customerName, mode: "insensitive" } },
      });
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            companyId,
            name: row.customerName,
            isCustomer: true,
            defaultCurrency: row.currency,
          },
        });
      }

      // The spreadsheet may not carry a due date (Gekko's export doesn't) — fall back to the
      // customer's own payment terms rather than the issue date itself, same as every other
      // invoice-creating path in this app (createInvoice, duplicateInvoice).
      const dueDate = row.dueDate ?? addDays(row.issueDate, contact.paymentTermsDays);

      const status =
        row.status ??
        deriveInvoiceStatus({
          currentStatus: "SENT",
          totalAmount: row.totalAmount,
          amountPaid: row.amountPaid,
          dueDate: new Date(dueDate),
        });
      const amountPaid = status === "DRAFT" || status === "CANCELLED" ? "0.00" : row.amountPaid;
      const balanceDue = toDecimalString(new Decimal(row.totalAmount).minus(amountPaid));

      await prisma.invoice.create({
        data: {
          companyId,
          customerId: contact.id,
          invoiceNumber: row.invoiceNumber,
          issueDate: new Date(row.issueDate),
          dueDate: new Date(dueDate),
          currency: row.currency,
          status,
          subtotal: row.subtotal,
          taxTotal: row.taxTotal,
          totalAmount: row.totalAmount,
          amountPaid,
          balanceDue,
          isHistorical: true,
        },
      });
      imported++;
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("Unique constraint")
          ? "An invoice with this number already exists."
          : error instanceof Error
            ? error.message
            : "Failed to import this row.";
      skipped.push({ rowNumber: row.rowNumber, invoiceNumber: row.invoiceNumber, message });
    }
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  return { imported, skipped };
}
