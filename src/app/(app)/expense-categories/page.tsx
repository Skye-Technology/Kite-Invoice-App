import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/delete-button";
import { createExpenseCategory, deleteExpenseCategory } from "./actions";

export default async function ExpenseCategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const categories = await prisma.expenseCategory.findMany({
    where: { companyId: current.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-xl font-semibold text-neutral-900">Expense categories</h2>

      <form action={createExpenseCategory} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="companyId" value={current.id} />
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="description">
            Description
          </label>
          <input
            id="description"
            name="description"
            className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="taxRateDefault">
            Default tax rate
          </label>
          <input
            id="taxRateDefault"
            name="taxRateDefault"
            type="number"
            step="0.01"
            min="0"
            max="1"
            defaultValue="0"
            required
            className="mt-1 w-28 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add category
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-neutral-500">No categories yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Default tax</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3 font-medium text-neutral-900">{category.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{category.description || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {(Number(category.taxRateDefault) * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton
                      action={deleteExpenseCategory.bind(null, category.id, current.id)}
                      confirmMessage={`Delete category "${category.name}"?`}
                    />
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
