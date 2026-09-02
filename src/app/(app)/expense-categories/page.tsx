import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { ActionButton } from "@/components/action-button";
import { createExpenseCategory, setExpenseCategoryArchived } from "./actions";

function CategoryTable({
  categories,
  companyId,
}: {
  categories: {
    id: string;
    icon: string;
    name: string;
    isBalanceSheet: boolean;
    vatDeductible: boolean;
    isArchived: boolean;
    taxRateDefault: unknown;
  }[];
  companyId: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
          <tr>
            <th className="px-4 py-2 font-medium">Icon</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Default tax</th>
            <th className="px-4 py-2 text-center font-medium">Balance sheet?</th>
            <th className="px-4 py-2 text-center font-medium">VAT deductible?</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {categories.map((category) => (
            <tr
              key={category.id}
              className={`hover:bg-neutral-50 ${category.isArchived ? "opacity-50" : ""}`}
            >
              <td className="px-4 py-3 text-lg">{category.icon}</td>
              <td className="px-4 py-3 font-medium text-neutral-900">
                {category.name}
                {category.isArchived && (
                  <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                    Archived
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {(Number(category.taxRateDefault) * 100).toFixed(0)}%
              </td>
              <td className="px-4 py-3 text-center">{category.isBalanceSheet ? "✓" : "—"}</td>
              <td className="px-4 py-3 text-center">{category.vatDeductible ? "✓" : "—"}</td>
              <td className="px-4 py-3 text-right">
                <ActionButton
                  action={setExpenseCategoryArchived.bind(
                    null,
                    category.id,
                    companyId,
                    !category.isArchived
                  )}
                  label={category.isArchived ? "Unarchive" : "Archive"}
                  pendingLabel="Saving..."
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ExpenseCategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const categories = await prisma.expenseCategory.findMany({
    where: { companyId: current.id },
    orderBy: { name: "asc" },
  });
  const customCategories = categories.filter((c) => !c.isDefault);
  const defaultCategories = categories.filter((c) => c.isDefault);

  return (
    <div className="max-w-3xl space-y-8">
      <h2 className="text-2xl font-bold text-neutral-900">Expense categories</h2>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-700">Your custom categories</h3>

        <form
          action={createExpenseCategory}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
        >
          <input type="hidden" name="companyId" value={current.id} />
          <div>
            <label className="text-xs font-medium text-neutral-700" htmlFor="icon">
              Icon
            </label>
            <input
              id="icon"
              name="icon"
              defaultValue="🏷️"
              maxLength={8}
              required
              className="mt-1 w-16 rounded-md border border-neutral-300 bg-white px-2 py-2 text-center text-lg outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="mt-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700" htmlFor="taxRateDefault">
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
              className="mt-1 w-24 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-neutral-700">
            <input type="checkbox" name="isBalanceSheet" className="size-4" />
            Balance sheet?
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-neutral-700">
            <input type="checkbox" name="vatDeductible" defaultChecked className="size-4" />
            VAT deductible?
          </label>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Create
          </button>
        </form>

        {customCategories.length > 0 && (
          <CategoryTable categories={customCategories} companyId={current.id} />
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-700">Default categories</h3>
        <CategoryTable categories={defaultCategories} companyId={current.id} />
      </div>
    </div>
  );
}
