import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { ExpenseForm } from "@/components/expense-form";
import { createExpense } from "../actions";

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const [vendors, categories] = await Promise.all([
    prisma.contact.findMany({ where: { companyId: current.id, isSupplier: true }, orderBy: { name: "asc" } }),
    prisma.expenseCategory.findMany({
      where: { companyId: current.id, isArchived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">New expense</h2>
      <ExpenseForm
        companyId={current.id}
        companyCurrency={current.defaultCurrency}
        vendors={vendors}
        categories={categories}
        action={createExpense}
        submitLabel="Create expense"
      />
    </div>
  );
}
