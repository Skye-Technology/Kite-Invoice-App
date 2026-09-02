import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);

  if (!current) {
    return (
      <p className="text-sm text-neutral-500">
        No companies yet. Run <code>npm run db:seed</code> or add one from Settings.
      </p>
    );
  }

  const [customerCount, vendorCount, invoiceStats, expenseStats] = await Promise.all([
    prisma.contact.count({ where: { companyId: current.id, isCustomer: true } }),
    prisma.contact.count({ where: { companyId: current.id, isSupplier: true } }),
    prisma.invoice.aggregate({
      where: { companyId: current.id },
      _sum: { totalAmount: true, balanceDue: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { companyId: current.id },
      _sum: { totalAmount: true, balanceDue: true },
      _count: true,
    }),
  ]);

  const revenue = Number(invoiceStats._sum.totalAmount ?? 0);
  const outstanding = Number(invoiceStats._sum.balanceDue ?? 0);
  const costs = Number(expenseStats._sum.totalAmount ?? 0);
  const unpaidExpenses = Number(expenseStats._sum.balanceDue ?? 0);

  const cards = [
    { label: "Total revenue", value: `${current.defaultCurrency} ${revenue.toFixed(2)}` },
    { label: "Outstanding invoices", value: `${current.defaultCurrency} ${outstanding.toFixed(2)}` },
    { label: "Total expenses", value: `${current.defaultCurrency} ${costs.toFixed(2)}` },
    { label: "Unpaid expenses", value: `${current.defaultCurrency} ${unpaidExpenses.toFixed(2)}` },
    { label: "Net cash position", value: `${current.defaultCurrency} ${(revenue - costs).toFixed(2)}` },
    { label: "Customers / Suppliers", value: `${customerCount} / ${vendorCount}` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">{current.name}</h2>
        <p className="text-sm text-neutral-500">
          {invoiceStats._count} invoices &middot; {expenseStats._count} expenses
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          href="/invoices/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          New invoice
        </Link>
        <Link
          href="/contacts/new"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
        >
          New contact
        </Link>
      </div>
    </div>
  );
}
