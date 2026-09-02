import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { deriveQuotationStatus } from "@/lib/status";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-purple-100 text-purple-700",
};

export default async function QuotationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const quotations = await prisma.quotation.findMany({
    where: { companyId: current.id },
    include: { customer: true },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">Quotations</h2>
        <Link
          href="/quotations/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          New quotation
        </Link>
      </div>

      {quotations.length === 0 ? (
        <p className="text-sm text-neutral-500">No quotations yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Valid until</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {quotations.map((quotation) => {
                const status = deriveQuotationStatus({
                  currentStatus: quotation.status,
                  validUntilDate: quotation.validUntilDate,
                });
                return (
                  <tr key={quotation.id}>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      <Link href={`/quotations/${quotation.id}`} className="hover:underline">
                        {quotation.quotationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{quotation.customer.name}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {quotation.validUntilDate.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {quotation.currency} {Number(quotation.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
