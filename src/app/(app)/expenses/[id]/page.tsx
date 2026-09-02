import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { publicObjectUrl } from "@/lib/storage";
import { ExpensePaymentForm } from "@/components/expense-payment-form";
import { ReceiptUploadForm } from "@/components/receipt-upload-form";
import { ActionButton } from "@/components/action-button";
import {
  recordExpensePayment,
  deleteExpense,
  duplicateExpense,
  uploadExpenseReceipt,
  deleteAttachment,
} from "../actions";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-neutral-100 text-neutral-600",
  PAID: "bg-green-100 text-green-700",
  REIMBURSABLE: "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const expense = await prisma.expense.findFirst({
    where: { id, companyId: current.id },
    include: {
      vendor: true,
      category: true,
      lines: { orderBy: { sortOrder: "asc" } },
      expensePayments: { orderBy: { paymentDate: "desc" } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!expense) notFound();

  const editable = Number(expense.amountPaid) === 0;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{expense.expenseNumber}</h2>
          <p className="text-sm text-neutral-500">
            {expense.vendor?.name || "No vendor"}
            {expense.category ? ` · ${expense.category.name}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[expense.status]}`}
        >
          {expense.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/expenses/${expense.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Download PDF
        </a>
        <ActionButton
          action={duplicateExpense.bind(null, expense.id, current.id)}
          label="Duplicate"
          pendingLabel="Duplicating..."
        />
        {editable && (
          <>
            <Link
              href={`/expenses/${expense.id}/edit`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Edit
            </Link>
            <ActionButton
              action={deleteExpense.bind(null, expense.id, current.id)}
              label="Delete"
              variant="danger"
              confirmMessage="Delete this expense?"
            />
          </>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-neutral-500">Expense date</p>
            <p className="font-medium text-neutral-900">
              {expense.expenseDate.toISOString().slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Due date</p>
            <p className="font-medium text-neutral-900">
              {expense.dueDate ? expense.dueDate.toISOString().slice(0, 10) : "—"}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Total</p>
            <p className="font-medium text-neutral-900">
              {expense.currency} {Number(expense.totalAmount).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Balance due</p>
            <p className="font-medium text-neutral-900">
              {expense.currency} {Number(expense.balanceDue).toFixed(2)}
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
            {expense.lines.map((line) => (
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

      {expense.notes && (
        <div>
          <p className="text-sm font-medium text-neutral-700">Notes</p>
          <p className="text-sm text-neutral-600">{expense.notes}</p>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-700">Receipts</h3>
        {expense.attachments.length > 0 && (
          <ul className="space-y-2">
            {expense.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                <a
                  href={publicObjectUrl(attachment.storageKey)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-700 hover:underline"
                >
                  {attachment.fileName}
                </a>
                <ActionButton
                  action={deleteAttachment.bind(null, attachment.id, current.id, expense.id)}
                  label="Remove"
                  variant="danger"
                  confirmMessage="Remove this receipt?"
                />
              </li>
            ))}
          </ul>
        )}
        <ReceiptUploadForm action={uploadExpenseReceipt.bind(null, expense.id, current.id)} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-700">Payments</h3>

        {expense.expensePayments.length > 0 && (
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
                {expense.expensePayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2">{payment.paymentDate.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      {payment.currency} {Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {expense.currency} {Number(payment.convertedAmount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">{payment.paymentMethod || "—"}</td>
                    <td className="px-3 py-2">{payment.referenceNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ExpensePaymentForm
          companyId={current.id}
          expenseId={expense.id}
          expenseCurrency={expense.currency}
          action={recordExpensePayment}
        />
      </div>
    </div>
  );
}
