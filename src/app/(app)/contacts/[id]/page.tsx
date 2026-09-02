import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/contact-form";
import { updateContact } from "../actions";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const contact = await prisma.contact.findFirst({
    where: { id, companyId: current.id },
  });
  if (!contact) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Edit contact</h2>
      <ContactForm
        companyId={current.id}
        values={{
          name: contact.name,
          isCustomer: contact.isCustomer,
          isSupplier: contact.isSupplier,
          contactPerson: contact.contactPerson,
          email: contact.email,
          phone: contact.phone,
          address: contact.address,
          city: contact.city,
          postalCode: contact.postalCode,
          country: contact.country,
          registrationNumber: contact.registrationNumber,
          website: contact.website,
          defaultCurrency: contact.defaultCurrency,
          paymentTermsDays: contact.paymentTermsDays,
          notes: contact.notes,
        }}
        action={updateContact.bind(null, contact.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
