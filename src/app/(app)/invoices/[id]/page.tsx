import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "@/components/payment-form";
import { ActionButton } from "@/components/action-button";
import {
  recordPaymentReceipt,
  markInvoiceSent,
  cancelInvoice,
  deleteInvoice,
  duplicateInvoice,
} from "../actions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-neutral-100 text-neutral-400 line-through",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId: current.id },
    include: {
      customer: true,
      lines: { orderBy: { sortOrder: "asc" } },
      paymentReceipts: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!invoice) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{invoice.invoiceNumber}</h2>
          <p className="text-sm text-neutral-500">{invoice.customer.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.isHistorical && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              Historical
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
          >
            {invoice.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {invoice.isHistorical && (
        <p className="text-sm text-neutral-500">
          Imported for record-keeping only — no line items or PDF.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!invoice.isHistorical && (
          <>
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Download PDF
            </a>
            <ActionButton
              action={duplicateInvoice.bind(null, invoice.id, current.id)}
              label="Duplicate"
              pendingLabel="Duplicating..."
            />
          </>
        )}
        {invoice.status === "DRAFT" && (
          <>
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Edit
            </Link>
            <ActionButton
              action={markInvoiceSent.bind(null, invoice.id, current.id)}
              label="Mark as sent"
              pendingLabel="Sending..."
            />
            <ActionButton
              action={deleteInvoice.bind(null, invoice.id, current.id)}
              label="Delete"
              variant="danger"
              confirmMessage="Delete this draft invoice?"
            />
          </>
        )}
        {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
          <ActionButton
            action={cancelInvoice.bind(null, invoice.id, current.id)}
            label="Cancel invoice"
            variant="danger"
            confirmMessage="Cancel this invoice?"
          />
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-neutral-500">Issue date</p>
            <p className="font-medium text-neutral-900">
              {invoice.issueDate.toISOString().slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Due date</p>
            <p className="font-medium text-neutral-900">
              {invoice.dueDate.toISOString().slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Subtotal</p>
            <p className="font-medium text-neutral-900">
              {invoice.currency} {Number(invoice.subtotal).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Balance due</p>
            <p className="font-medium text-neutral-900">
              {invoice.currency} {Number(invoice.balanceDue).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">VAT</span>
            <span className="text-neutral-900">
              {invoice.currency} {Number(invoice.taxTotal).toFixed(2)}
            </span>
            {invoice.reverseCharge && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                Reverse charge
              </span>
            )}
          </div>
          <div>
            <span className="text-neutral-500">Total </span>
            <span className="font-semibold text-neutral-900">
              {invoice.currency} {Number(invoice.totalAmount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {!invoice.isHistorical && (
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
              {invoice.lines.map((line) => (
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
      )}

      {invoice.notes && (
        <div>
          <p className="text-sm font-medium text-neutral-700">Notes</p>
          <p className="text-sm text-neutral-600">{invoice.notes}</p>
        </div>
      )}

      {invoice.status !== "DRAFT" && invoice.status !== "CANCELLED" && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-neutral-700">Payment receipts</h3>

          {invoice.paymentReceipts.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Converted</th>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {invoice.paymentReceipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td className="px-3 py-2">{receipt.paymentDate.toISOString().slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        {receipt.currency} {Number(receipt.amount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {invoice.currency} {Number(receipt.convertedAmount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">{receipt.paymentMethod || "—"}</td>
                      <td className="px-3 py-2">{receipt.referenceNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaymentForm
            companyId={current.id}
            invoiceId={invoice.id}
            invoiceCurrency={invoice.currency}
            action={recordPaymentReceipt}
          />
        </div>
      )}
    </div>
  );
}
