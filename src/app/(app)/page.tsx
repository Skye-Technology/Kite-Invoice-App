import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Users, PiggyBank, Landmark } from "lucide-react";
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

  const [customerCount, vendorCount, invoiceCount, expenseCount, invoicesByCurrency, expensesByCurrency] =
    await Promise.all([
      prisma.contact.count({ where: { companyId: current.id, isCustomer: true } }),
      prisma.contact.count({ where: { companyId: current.id, isSupplier: true } }),
      prisma.invoice.count({ where: { companyId: current.id } }),
      prisma.expense.count({ where: { companyId: current.id } }),
      prisma.invoice.groupBy({
        by: ["currency"],
        where: { companyId: current.id },
        _sum: { totalAmount: true, balanceDue: true },
      }),
      prisma.expense.groupBy({
        by: ["currency"],
        where: { companyId: current.id },
        _sum: { totalAmount: true, balanceDue: true },
      }),
    ]);

  // Invoices and expenses can each be in a different currency, and this app has no FX
  // rates to convert between them — so summing totalAmount across currencies and labeling
  // it with the company's default currency would silently blend, say, real USD and EUR
  // amounts into one falsely-labeled number. Instead, group by currency and show each
  // currency's figures on their own line within each card.
  const currencies = Array.from(
    new Set([...invoicesByCurrency.map((g) => g.currency), ...expensesByCurrency.map((g) => g.currency)])
  ).sort();

  const revenueByCurrency = currencies.map((currency) => ({
    currency,
    amount: Number(invoicesByCurrency.find((g) => g.currency === currency)?._sum.totalAmount ?? 0),
  }));
  const outstandingByCurrency = currencies.map((currency) => ({
    currency,
    amount: Number(invoicesByCurrency.find((g) => g.currency === currency)?._sum.balanceDue ?? 0),
  }));
  const costsByCurrency = currencies.map((currency) => ({
    currency,
    amount: Number(expensesByCurrency.find((g) => g.currency === currency)?._sum.totalAmount ?? 0),
  }));
  const unpaidExpensesByCurrency = currencies.map((currency) => ({
    currency,
    amount: Number(expensesByCurrency.find((g) => g.currency === currency)?._sum.balanceDue ?? 0),
  }));
  const netCashByCurrency = currencies.map((currency) => ({
    currency,
    amount:
      (revenueByCurrency.find((c) => c.currency === currency)?.amount ?? 0) -
      (costsByCurrency.find((c) => c.currency === currency)?.amount ?? 0),
  }));
  const netCashPositive = netCashByCurrency.every((c) => c.amount >= 0);

  const cards = [
    {
      label: "Total revenue",
      amounts: revenueByCurrency,
      sub: `${invoiceCount} invoices`,
      icon: Landmark,
    },
    {
      label: "Outstanding invoices",
      amounts: outstandingByCurrency,
      sub: "Awaiting payment",
      icon: Wallet,
    },
    {
      label: "Total expenses",
      amounts: costsByCurrency,
      sub: `${expenseCount} expenses`,
      icon: PiggyBank,
    },
    {
      label: "Unpaid expenses",
      amounts: unpaidExpensesByCurrency,
      sub: "Owed to vendors",
      icon: Wallet,
    },
    {
      label: "Net cash position",
      amounts: netCashByCurrency,
      sub: netCashPositive ? "Revenue over expenses" : "Expenses over revenue",
      icon: netCashPositive ? TrendingUp : TrendingDown,
      trendColor: netCashPositive ? "text-green-600" : "text-red-600",
    },
    {
      label: "Customers / Suppliers",
      amounts: null,
      value: `${customerCount} / ${vendorCount}`,
      sub: "Active contacts",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{current.name}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {invoiceCount} invoices &middot; {expenseCount} expenses
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/invoices/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New invoice
          </Link>
          <Link
            href="/contacts/new"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            New contact
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <card.icon
              className={`size-5 ${card.trendColor ?? "text-neutral-400"}`}
              strokeWidth={1.75}
            />
            <div className="mt-3 space-y-1">
              {card.amounts ? (
                card.amounts.length > 0 ? (
                  card.amounts.map((a) => (
                    <p key={a.currency} className="text-2xl font-bold text-neutral-900">
                      {a.currency} {a.amount.toFixed(2)}
                    </p>
                  ))
                ) : (
                  <p className="text-2xl font-bold text-neutral-900">
                    {current.defaultCurrency} 0.00
                  </p>
                )
              ) : (
                <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-neutral-700">{card.label}</p>
            <p className="text-xs text-neutral-400">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
