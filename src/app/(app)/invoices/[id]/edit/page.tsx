import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/invoice-form";
import { updateInvoice } from "../../actions";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const [invoice, customers] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, companyId: current.id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.contact.findMany({ where: { companyId: current.id, isCustomer: true }, orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${invoice.id}`);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Edit {invoice.invoiceNumber}</h2>
      <InvoiceForm
        companyId={current.id}
        companyCurrency={current.defaultCurrency}
        customers={customers}
        action={updateInvoice.bind(null, invoice.id)}
        submitLabel="Save changes"
        initial={{
          customerId: invoice.customerId,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          currency: invoice.currency,
          notes: invoice.notes ?? "",
          reverseCharge: invoice.reverseCharge,
          lines: invoice.lines.map((line) => ({
            description: line.description,
            quantity: String(line.quantity),
            unitRate: String(line.unitRate),
            taxRate: String(line.taxRate),
          })),
        }}
      />
    </div>
  );
}
