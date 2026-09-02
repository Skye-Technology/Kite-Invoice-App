"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/current-company";

const categorySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  taxRateDefault: z.coerce.number().min(0).max(1),
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
      description: data.description || null,
      taxRateDefault: data.taxRateDefault,
    },
  });

  revalidatePath("/expense-categories");
}

export async function deleteExpenseCategory(categoryId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  await prisma.expenseCategory.delete({ where: { id: categoryId, companyId } });
  revalidatePath("/expense-categories");
}
