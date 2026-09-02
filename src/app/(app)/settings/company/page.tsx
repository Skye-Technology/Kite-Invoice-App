import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { publicObjectUrl } from "@/lib/storage";
import { CompanyForm } from "@/components/company-form";
import { LogoUploadForm } from "@/components/logo-upload-form";
import { NextInvoiceNumberForm } from "@/components/next-invoice-number-form";
import {
  updateCompany,
  uploadCompanyLogo,
  removeCompanyLogo,
  setNextInvoiceNumber,
} from "../actions";

export default async function CompanySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">Company settings</h2>
        <Link
          href="/settings/companies/new"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Add another company
        </Link>
      </div>

      <div className="max-w-2xl space-y-2">
        <label className="text-sm font-medium text-neutral-700">Logo</label>
        <p className="text-xs text-neutral-500">
          Shown on invoice, quotation, and expense PDFs. PNG, JPEG, WebP, or SVG, up to 2MB.
        </p>
        <LogoUploadForm
          currentLogoUrl={current.logoStorageKey ? publicObjectUrl(current.logoStorageKey) : null}
          uploadAction={uploadCompanyLogo.bind(null, current.id)}
          removeAction={removeCompanyLogo.bind(null, current.id)}
        />
      </div>

      <div className="max-w-2xl space-y-2">
        <NextInvoiceNumberForm
          currentNext={current.invoiceNumberSeq + 1}
          year={new Date().getFullYear()}
          action={setNextInvoiceNumber.bind(null, current.id)}
        />
      </div>

      <CompanyForm
        values={current}
        action={updateCompany.bind(null, current.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
