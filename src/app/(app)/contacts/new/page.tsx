import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { ContactForm } from "@/components/contact-form";
import { createContact } from "../actions";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">New contact</h2>
      <ContactForm
        companyId={current.id}
        values={{
          defaultCurrency: current.defaultCurrency,
          paymentTermsDays: 14,
          isCustomer: role === "customer",
          isSupplier: role === "supplier",
        }}
        action={createContact}
        submitLabel="Create contact"
      />
    </div>
  );
}
