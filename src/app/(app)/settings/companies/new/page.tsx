import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CompanyForm } from "@/components/company-form";
import { createCompany } from "../../actions";

export default async function NewCompanyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Add company</h2>
      <CompanyForm action={createCompany} submitLabel="Create company" />
    </div>
  );
}
