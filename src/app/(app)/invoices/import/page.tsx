import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { HistoricalInvoiceImport } from "@/components/historical-invoice-import";
import { importHistoricalInvoices } from "../actions";

export default async function ImportInvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/invoices" className="text-sm text-neutral-500 hover:text-neutral-900">
          &larr; Back to invoices
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-neutral-900">Import historical invoices</h2>
        <p className="mt-1 text-sm text-neutral-500">
          For record-keeping only — no line items, no PDF. Each row becomes a lightweight invoice
          entry marked &ldquo;Historical&rdquo; and counts toward the dashboard totals, but doesn&apos;t
          consume the next-invoice-number sequence (the number comes straight from the file).
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        <p className="font-medium text-neutral-900">Expected columns (header row)</p>
        <p className="mt-1">
          <span className="font-mono text-xs">Invoice Number</span>,{" "}
          <span className="font-mono text-xs">Customer</span>,{" "}
          <span className="font-mono text-xs">Issue Date</span>,{" "}
          <span className="font-mono text-xs">Total</span> are required.{" "}
          <span className="font-mono text-xs">Due Date</span>,{" "}
          <span className="font-mono text-xs">Currency</span> (defaults to{" "}
          {current.defaultCurrency}), and <span className="font-mono text-xs">Amount Paid</span>{" "}
          are optional.
        </p>
        <p className="mt-2">
          Gekko exports also work directly — its{" "}
          <span className="font-mono text-xs">Invoice number</span> /{" "}
          <span className="font-mono text-xs">Date invoice</span> /{" "}
          <span className="font-mono text-xs">Total amount</span> /{" "}
          <span className="font-mono text-xs">Bank transaction</span> headers are recognized
          automatically. Must be .xlsx — if Gekko gave you a legacy .xls file, open it in
          Excel/Sheets and re-save as .xlsx first.
        </p>
        <p className="mt-2">
          A customer name with no existing matching contact is created automatically. A row whose
          invoice number already exists is skipped, not overwritten.
        </p>
      </div>

      <HistoricalInvoiceImport importAction={importHistoricalInvoices.bind(null, current.id)} />
    </div>
  );
}
