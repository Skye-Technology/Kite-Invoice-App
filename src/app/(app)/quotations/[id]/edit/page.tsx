import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotation-form";
import { updateQuotation } from "../../actions";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const [quotation, customers] = await Promise.all([
    prisma.quotation.findFirst({
      where: { id, companyId: current.id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.contact.findMany({
      where: { companyId: current.id, isCustomer: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!quotation) notFound();
  if (quotation.status !== "DRAFT") redirect(`/quotations/${quotation.id}`);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Edit {quotation.quotationNumber}</h2>
      <QuotationForm
        companyId={current.id}
        companyCurrency={current.defaultCurrency}
        customers={customers}
        action={updateQuotation.bind(null, quotation.id)}
        submitLabel="Save changes"
        initial={{
          customerId: quotation.customerId,
          issueDate: quotation.issueDate.toISOString().slice(0, 10),
          validUntilDate: quotation.validUntilDate.toISOString().slice(0, 10),
          currency: quotation.currency,
          notes: quotation.notes ?? "",
          lines: quotation.lines.map((line) => ({
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
