"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/current-company";

const categorySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1).max(8),
  description: z.string().optional(),
  taxRateDefault: z.coerce.number().min(0).max(1),
  isBalanceSheet: z.string().optional(),
  vatDeductible: z.string().optional(),
});

export async function createExpenseCategory(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const data = categorySchema.parse(Object.fromEntries(formData.entries()));
  await requireCompanyAccess(session.user.id, data.companyId);

  await prisma.expenseCategory.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      icon: data.icon,
      description: data.description || null,
      taxRateDefault: data.taxRateDefault,
      isBalanceSheet: data.isBalanceSheet === "on",
      vatDeductible: data.vatDeductible === "on",
    },
  });

  revalidatePath("/expense-categories");
}

/**
 * Archive/unarchive rather than delete — matches Gekko's own design and avoids orphaning
 * historical expenses' category reference (Expense.categoryId is a nullable FK with no
 * onDelete: Cascade, so a hard delete would silently null it out on every past expense that
 * used this category). Archived categories are hidden from new-expense pickers but keep
 * showing correctly on expenses that already reference them.
 */
export async function setExpenseCategoryArchived(
  categoryId: string,
  companyId: string,
  isArchived: boolean
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  await prisma.expenseCategory.update({
    where: { id: categoryId, companyId },
    data: { isArchived },
  });
  revalidatePath("/expense-categories");
}
