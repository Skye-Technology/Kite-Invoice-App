"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/current-company";
import { computeTotals, toDecimalString } from "@/lib/money";
import { nextExpenseNumber } from "@/lib/numbering";
import { deriveExpenseStatus } from "@/lib/status";
import { buildStorageKey, uploadObject, deleteObject } from "@/lib/storage";

const lineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive(),
  unitRate: z.coerce.number(),
  taxRate: z.coerce.number().min(0).max(1),
});

const expenseSchema = z.object({
  companyId: z.string().min(1),
  vendorId: z.string().optional(),
  categoryId: z.string().optional(),
  expenseDate: z.string().min(1),
  dueDate: z.string().optional(),
  currency: z.string().min(3).max(3),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  reimbursable: z.string().optional(),
  reverseCharge: z.string().optional(),
  linesJson: z.string().min(1),
});

function parseExpenseForm(formData: FormData) {
  const raw = Object.fromEntries(
    Array.from(formData.entries()).filter(([, v]) => typeof v === "string")
  );
  const base = expenseSchema.parse(raw);

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(base.linesJson);
  } catch {
    throw new Error("Invalid line items.");
  }
  const lines = z.array(lineSchema).min(1, "At least one line item is required").parse(linesRaw);

  return { base, lines };
}

async function uploadReceiptIfPresent(
  formData: FormData,
  companyId: string,
  expenseId: string
) {
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return;

  const key = buildStorageKey(`receipts/${companyId}`, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject({ key, body: buffer, contentType: file.type || "application/octet-stream" });

  await prisma.attachment.create({
    data: {
      companyId,
      storageKey: key,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      relatedType: "EXPENSE_RECEIPT",
      expenseId,
    },
  });
}

export async function createExpense(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const { base, lines } = parseExpenseForm(formData);
  await requireCompanyAccess(session.user.id, base.companyId);

  const { subtotal, taxTotal, totalAmount } = computeTotals(lines);
  const expenseNumber = await nextExpenseNumber(base.companyId);
  const status = base.reimbursable === "on" ? "REIMBURSABLE" : "PENDING";

  const expense = await prisma.expense.create({
    data: {
      companyId: base.companyId,
      vendorId: base.vendorId || null,
      categoryId: base.categoryId || null,
      expenseNumber,
      expenseDate: new Date(base.expenseDate),
      dueDate: base.dueDate ? new Date(base.dueDate) : null,
      currency: base.currency,
      status,
      description: base.description,
      subtotal: toDecimalString(subtotal),
      taxTotal: toDecimalString(taxTotal),
      totalAmount: toDecimalString(totalAmount),
      balanceDue: toDecimalString(totalAmount),
      reverseCharge: base.reverseCharge === "on",
      paymentMethod: base.paymentMethod || null,
      referenceNumber: base.referenceNumber || null,
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

  await uploadReceiptIfPresent(formData, base.companyId, expense.id);

  revalidatePath("/expenses");
  redirect(`/expenses/${expense.id}`);
}

export async function updateExpense(expenseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const { base, lines } = parseExpenseForm(formData);
  await requireCompanyAccess(session.user.id, base.companyId);

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, companyId: base.companyId },
  });
  if (!existing) throw new Error("Expense not found.");
  if (Number(existing.amountPaid) > 0) {
    throw new Error("Cannot edit an expense that already has payments recorded.");
  }

  const { subtotal, taxTotal, totalAmount } = computeTotals(lines);
  const status = base.reimbursable === "on" ? "REIMBURSABLE" : "PENDING";

  await prisma.$transaction([
    prisma.expenseLine.deleteMany({ where: { expenseId } }),
    prisma.expense.update({
      where: { id: expenseId },
      data: {
        vendorId: base.vendorId || null,
        categoryId: base.categoryId || null,
        expenseDate: new Date(base.expenseDate),
        dueDate: base.dueDate ? new Date(base.dueDate) : null,
        currency: base.currency,
        status,
        description: base.description,
        subtotal: toDecimalString(subtotal),
        taxTotal: toDecimalString(taxTotal),
        totalAmount: toDecimalString(totalAmount),
        balanceDue: toDecimalString(totalAmount),
        reverseCharge: base.reverseCharge === "on",
        paymentMethod: base.paymentMethod || null,
        referenceNumber: base.referenceNumber || null,
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

  await uploadReceiptIfPresent(formData, base.companyId, expenseId);

  revalidatePath("/expenses");
  redirect(`/expenses/${expenseId}`);
}

/**
 * Creates a new expense by copying vendor, category, and line items from an existing one,
 * with a fresh date and no receipt/payments attached. Lightweight stand-in for recurring
 * expenses — no scheduler, just a one-click way to re-log the same monthly cost.
 */
export async function duplicateExpense(expenseId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const source = await prisma.expense.findFirst({
    where: { id: expenseId, companyId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) throw new Error("Expense not found.");

  const expenseNumber = await nextExpenseNumber(companyId);
  const expenseDate = new Date();
  const dueDate = source.dueDate
    ? new Date(expenseDate.getTime() + (source.dueDate.getTime() - source.expenseDate.getTime()))
    : null;

  const expense = await prisma.expense.create({
    data: {
      companyId,
      vendorId: source.vendorId,
      categoryId: source.categoryId,
      expenseNumber,
      expenseDate,
      dueDate,
      currency: source.currency,
      status: "PENDING",
      description: source.description,
      subtotal: source.subtotal,
      taxTotal: source.taxTotal,
      totalAmount: source.totalAmount,
      balanceDue: source.totalAmount,
      reverseCharge: source.reverseCharge,
      paymentMethod: source.paymentMethod,
      notes: source.notes,
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

  revalidatePath("/expenses");
  redirect(`/expenses/${expense.id}`);
}

export async function deleteExpense(expenseId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, companyId },
    include: { attachments: true },
  });
  if (!expense) throw new Error("Expense not found.");
  if (Number(expense.amountPaid) > 0) {
    throw new Error("Cannot delete an expense that already has payments recorded.");
  }

  await Promise.all(expense.attachments.map((a) => deleteObject(a.storageKey).catch(() => {})));
  await prisma.expense.delete({ where: { id: expenseId } });

  revalidatePath("/expenses");
}

const paymentSchema = z.object({
  companyId: z.string().min(1),
  expenseId: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3),
  exchangeRate: z.coerce.number().positive(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordExpensePayment(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const data = paymentSchema.parse(Object.fromEntries(formData.entries()));
  await requireCompanyAccess(session.user.id, data.companyId);

  const expense = await prisma.expense.findFirst({
    where: { id: data.expenseId, companyId: data.companyId },
  });
  if (!expense) throw new Error("Expense not found.");

  const convertedAmount = new Decimal(data.amount).times(data.exchangeRate);
  const newAmountPaid = new Decimal(expense.amountPaid).plus(convertedAmount);
  const newBalanceDue = new Decimal(expense.totalAmount).minus(newAmountPaid);

  const status = deriveExpenseStatus({
    currentStatus: expense.status,
    totalAmount: expense.totalAmount,
    amountPaid: newAmountPaid,
    dueDate: expense.dueDate,
  });

  await prisma.$transaction([
    prisma.expensePayment.create({
      data: {
        companyId: data.companyId,
        expenseId: data.expenseId,
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
    prisma.expense.update({
      where: { id: data.expenseId },
      data: {
        amountPaid: toDecimalString(newAmountPaid),
        balanceDue: toDecimalString(newBalanceDue),
        status,
        paymentDate: new Date(data.paymentDate),
      },
    }),
  ]);

  revalidatePath(`/expenses/${data.expenseId}`);
  revalidatePath("/expenses");
}

export async function uploadExpenseReceipt(
  expenseId: string,
  companyId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  await uploadReceiptIfPresent(formData, companyId, expenseId);

  revalidatePath(`/expenses/${expenseId}`);
}

export async function deleteAttachment(attachmentId: string, companyId: string, expenseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, companyId, expenseId },
  });
  if (!attachment) throw new Error("Attachment not found.");

  await deleteObject(attachment.storageKey).catch(() => {});
  await prisma.attachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/expenses/${expenseId}`);
}
