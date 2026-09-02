import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { ExpenseForm } from "@/components/expense-form";
import { updateExpense } from "../../actions";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const [expense, vendors, categories] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, companyId: current.id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.contact.findMany({ where: { companyId: current.id, isSupplier: true }, orderBy: { name: "asc" } }),
    prisma.expenseCategory.findMany({ where: { companyId: current.id }, orderBy: { name: "asc" } }),
  ]);
  if (!expense) notFound();
  if (Number(expense.amountPaid) > 0) redirect(`/expenses/${expense.id}`);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Edit {expense.expenseNumber}</h2>
      <ExpenseForm
        companyId={current.id}
        companyCurrency={current.defaultCurrency}
        vendors={vendors}
        categories={categories}
        action={updateExpense.bind(null, expense.id)}
        submitLabel="Save changes"
        initial={{
          vendorId: expense.vendorId ?? "",
          categoryId: expense.categoryId ?? "",
          expenseDate: expense.expenseDate.toISOString().slice(0, 10),
          dueDate: expense.dueDate ? expense.dueDate.toISOString().slice(0, 10) : "",
          currency: expense.currency,
          description: expense.description,
          paymentMethod: expense.paymentMethod ?? "",
          referenceNumber: expense.referenceNumber ?? "",
          notes: expense.notes ?? "",
          reimbursable: expense.status === "REIMBURSABLE",
          lines: expense.lines.map((line) => ({
            description: line.description,
            quantity: String(line.quantity),
            unitRate: String(line.unitRate),
            taxRate: String(line.taxRate),
          })),
        }}
      />
    </div>
  );
}
