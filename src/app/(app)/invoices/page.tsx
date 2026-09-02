import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-neutral-100 text-neutral-400 line-through",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const invoices = await prisma.invoice.findMany({
    where: { companyId: current.id },
    include: { customer: true },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">Invoices</h2>
        <Link
          href="/invoices/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          New invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-neutral-500">No invoices yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{invoice.customer.name}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {invoice.dueDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {invoice.currency} {Number(invoice.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {invoice.currency} {Number(invoice.balanceDue).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
                    >
                      {invoice.status.replace("_", " ")}
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
