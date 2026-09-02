import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { deriveQuotationStatus } from "@/lib/status";
import { ActionButton } from "@/components/action-button";
import {
  markQuotationSent,
  acceptQuotation,
  declineQuotation,
  deleteQuotation,
  convertQuotationToInvoice,
} from "../actions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-purple-100 text-purple-700",
};

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const quotation = await prisma.quotation.findFirst({
    where: { id, companyId: current.id },
    include: {
      customer: true,
      lines: { orderBy: { sortOrder: "asc" } },
      convertedInvoice: true,
    },
  });
  if (!quotation) notFound();

  const status = deriveQuotationStatus({
    currentStatus: quotation.status,
    validUntilDate: quotation.validUntilDate,
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{quotation.quotationNumber}</h2>
          <p className="text-sm text-neutral-500">{quotation.customer.name}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
          {status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/quotations/${quotation.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Download PDF
        </a>
        {status === "DRAFT" && (
          <>
            <Link
              href={`/quotations/${quotation.id}/edit`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Edit
            </Link>
            <ActionButton
              action={markQuotationSent.bind(null, quotation.id, current.id)}
              label="Mark as sent"
              pendingLabel="Sending..."
            />
            <ActionButton
              action={deleteQuotation.bind(null, quotation.id, current.id)}
              label="Delete"
              variant="danger"
              confirmMessage="Delete this draft quotation?"
            />
          </>
        )}
        {(status === "SENT" || status === "EXPIRED") && (
          <>
            <ActionButton
              action={acceptQuotation.bind(null, quotation.id, current.id)}
              label="Accept"
              pendingLabel="Accepting..."
            />
            <ActionButton
              action={declineQuotation.bind(null, quotation.id, current.id)}
              label="Decline"
              variant="danger"
              confirmMessage="Decline this quotation?"
            />
          </>
        )}
        {(status === "SENT" || status === "ACCEPTED") && (
          <ActionButton
            action={convertQuotationToInvoice.bind(null, quotation.id, current.id)}
            label="Convert to invoice"
            pendingLabel="Converting..."
          />
        )}
      </div>

      {quotation.convertedInvoice && (
        <p className="text-sm text-neutral-600">
          Converted to invoice{" "}
          <Link href={`/invoices/${quotation.convertedInvoice.id}`} className="underline">
            {quotation.convertedInvoice.invoiceNumber}
          </Link>
        </p>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-neutral-500">Issue date</p>
            <p className="font-medium text-neutral-900">
              {quotation.issueDate.toISOString().slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Valid until</p>
            <p className="font-medium text-neutral-900">
              {quotation.validUntilDate.toISOString().slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Total</p>
            <p className="font-medium text-neutral-900">
              {quotation.currency} {Number(quotation.totalAmount).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Tax</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {quotation.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-3 py-2">{line.description}</td>
                <td className="px-3 py-2">{Number(line.quantity)}</td>
                <td className="px-3 py-2">{Number(line.unitRate).toFixed(2)}</td>
                <td className="px-3 py-2">{(Number(line.taxRate) * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-right">{Number(line.lineAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quotation.notes && (
        <div>
          <p className="text-sm font-medium text-neutral-700">Notes</p>
          <p className="text-sm text-neutral-600">{quotation.notes}</p>
        </div>
      )}
    </div>
  );
}
