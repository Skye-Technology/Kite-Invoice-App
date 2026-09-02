"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/current-company";
import { computeTotals, toDecimalString } from "@/lib/money";
import { nextQuotationNumber, nextInvoiceNumber } from "@/lib/numbering";

const lineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive(),
  unitRate: z.coerce.number(),
  taxRate: z.coerce.number().min(0).max(1),
});

const quotationSchema = z.object({
  companyId: z.string().min(1),
  customerId: z.string().min(1, "Choose a customer"),
  issueDate: z.string().min(1),
  validUntilDate: z.string().min(1),
  currency: z.string().min(3).max(3),
  notes: z.string().optional(),
  linesJson: z.string().min(1),
});

function parseQuotationForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const base = quotationSchema.parse(raw);

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(base.linesJson);
  } catch {
    throw new Error("Invalid line items.");
  }
  const lines = z.array(lineSchema).min(1, "At least one line item is required").parse(linesRaw);

  return { base, lines };
}

export async function createQuotation(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const { base, lines } = parseQuotationForm(formData);
  await requireCompanyAccess(session.user.id, base.companyId);

  const { subtotal, taxTotal, totalAmount } = computeTotals(lines);
  const quotationNumber = await nextQuotationNumber(base.companyId);

  const quotation = await prisma.quotation.create({
    data: {
      companyId: base.companyId,
      customerId: base.customerId,
      quotationNumber,
      issueDate: new Date(base.issueDate),
      validUntilDate: new Date(base.validUntilDate),
      currency: base.currency,
      status: "DRAFT",
      subtotal: toDecimalString(subtotal),
      taxTotal: toDecimalString(taxTotal),
      totalAmount: toDecimalString(totalAmount),
      notes: base.notes || null,
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

  revalidatePath("/quotations");
  redirect(`/quotations/${quotation.id}`);
}

export async function updateQuotation(quotationId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const { base, lines } = parseQuotationForm(formData);
  await requireCompanyAccess(session.user.id, base.companyId);

  const existing = await prisma.quotation.findFirst({
    where: { id: quotationId, companyId: base.companyId },
  });
  if (!existing) throw new Error("Quotation not found.");
  if (existing.status !== "DRAFT") throw new Error("Only draft quotations can be edited.");

  const { subtotal, taxTotal, totalAmount } = computeTotals(lines);

  await prisma.$transaction([
    prisma.quotationLine.deleteMany({ where: { quotationId } }),
    prisma.quotation.update({
      where: { id: quotationId },
      data: {
        customerId: base.customerId,
        issueDate: new Date(base.issueDate),
        validUntilDate: new Date(base.validUntilDate),
        currency: base.currency,
        subtotal: toDecimalString(subtotal),
        taxTotal: toDecimalString(taxTotal),
        totalAmount: toDecimalString(totalAmount),
        notes: base.notes || null,
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

  revalidatePath("/quotations");
  redirect(`/quotations/${quotationId}`);
}

export async function deleteQuotation(quotationId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, companyId } });
  if (!quotation) throw new Error("Quotation not found.");
  if (quotation.status !== "DRAFT") throw new Error("Only draft quotations can be deleted.");

  await prisma.quotation.delete({ where: { id: quotationId } });
  revalidatePath("/quotations");
}

export async function markQuotationSent(quotationId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, companyId } });
  if (!quotation) throw new Error("Quotation not found.");
  if (quotation.status !== "DRAFT") throw new Error("Only draft quotations can be marked sent.");

  await prisma.quotation.update({ where: { id: quotationId }, data: { status: "SENT" } });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
}

async function setQuotationStatus(
  quotationId: string,
  companyId: string,
  status: "ACCEPTED" | "DECLINED"
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, companyId } });
  if (!quotation) throw new Error("Quotation not found.");
  if (quotation.status !== "SENT" && quotation.status !== "EXPIRED") {
    throw new Error("Only a sent quotation can be accepted or declined.");
  }

  await prisma.quotation.update({ where: { id: quotationId }, data: { status } });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
}

export async function acceptQuotation(quotationId: string, companyId: string) {
  await setQuotationStatus(quotationId, companyId, "ACCEPTED");
}

export async function declineQuotation(quotationId: string, companyId: string) {
  await setQuotationStatus(quotationId, companyId, "DECLINED");
}

/**
 * Turns an accepted quotation into a real draft invoice, copying customer/currency/lines
 * and linking the two records so the quotation shows "Converted" with a link forward.
 */
export async function convertQuotationToInvoice(quotationId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, companyId },
    include: { lines: { orderBy: { sortOrder: "asc" } }, customer: true },
  });
  if (!quotation) throw new Error("Quotation not found.");
  if (quotation.status === "CONVERTED") throw new Error("Quotation was already converted.");
  if (quotation.status !== "SENT" && quotation.status !== "ACCEPTED") {
    throw new Error("Only a sent or accepted quotation can be converted to an invoice.");
  }

  const invoiceNumber = await nextInvoiceNumber(companyId);
  const issueDate = new Date();
  const dueDate = new Date(
    issueDate.getTime() + quotation.customer.paymentTermsDays * 24 * 60 * 60 * 1000
  );

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      customerId: quotation.customerId,
      invoiceNumber,
      issueDate,
      dueDate,
      currency: quotation.currency,
      status: "DRAFT",
      subtotal: quotation.subtotal,
      taxTotal: quotation.taxTotal,
      totalAmount: quotation.totalAmount,
      balanceDue: quotation.totalAmount,
      notes: quotation.notes,
      lines: {
        create: quotation.lines.map((line) => ({
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

  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: "CONVERTED", convertedInvoiceId: invoice.id },
  });

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}
