import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-neutral-100 text-neutral-600",
  PAID: "bg-green-100 text-green-700",
  REIMBURSABLE: "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const expenses = await prisma.expense.findMany({
    where: { companyId: current.id },
    include: { vendor: true, category: true },
    orderBy: { expenseDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Expenses</h2>
        <div className="flex gap-2">
          <Link
            href="/expense-categories"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Categories
          </Link>
          <Link
            href="/expenses/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New expense
          </Link>
        </div>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-neutral-500">No expenses yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Vendor</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    <Link href={`/expenses/${expense.id}`} className="hover:underline">
                      {expense.expenseNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{expense.description}</td>
                  <td className="px-4 py-3 text-neutral-600">{expense.vendor?.name || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{expense.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {expense.currency} {Number(expense.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {expense.currency} {Number(expense.balanceDue).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[expense.status]}`}
                    >
                      {expense.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
