import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotation-form";
import { createQuotation } from "../actions";

export default async function NewQuotationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const customers = await prisma.contact.findMany({
    where: { companyId: current.id, isCustomer: true },
    orderBy: { name: "asc" },
  });

  if (customers.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Add a{" "}
        <Link href="/contacts/new?role=customer" className="underline">
          customer
        </Link>{" "}
        before creating a quotation.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">New quotation</h2>
      <QuotationForm
        companyId={current.id}
        companyCurrency={current.defaultCurrency}
        customers={customers}
        action={createQuotation}
        submitLabel="Create quotation"
      />
    </div>
  );
}
