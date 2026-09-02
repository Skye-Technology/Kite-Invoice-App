"use client";

import { useState } from "react";
import { CURRENCIES } from "@/lib/currencies";

type CompanyFormValues = {
  name?: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  bankAccount?: string | null;
  defaultCurrency?: string;
  expensePrefix?: string;
  quotationPrefix?: string;
};

export function CompanyForm({
  values,
  action,
  submitLabel,
}: {
  values?: CompanyFormValues;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        try {
          await action(formData);
        } finally {
          setPending(false);
        }
      }}
      className="max-w-2xl space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name" name="name" defaultValue={values?.name ?? ""} required />
        <Field label="Email" name="email" type="email" defaultValue={values?.email ?? ""} />
        <Field label="Phone" name="phone" defaultValue={values?.phone ?? ""} />
        <Field label="Website" name="website" defaultValue={values?.website ?? ""} />
        <Field
          label="Registration number"
          name="registrationNumber"
          defaultValue={values?.registrationNumber ?? ""}
        />
        <Field label="Tax number" name="taxNumber" defaultValue={values?.taxNumber ?? ""} />
        <Field
          label="Bank account (IBAN)"
          name="bankAccount"
          defaultValue={values?.bankAccount ?? ""}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700" htmlFor="address">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          defaultValue={values?.address ?? ""}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-neutral-700">Defaults &amp; numbering</legend>
        <p className="text-xs text-neutral-500">
          Invoice numbers are year-based (e.g. 2026-0009) — see &quot;Next invoice
          number&quot; below to set the sequence. Quotations and expenses use their own
          text prefix instead.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="defaultCurrency">
              Default currency
            </label>
            <select
              id="defaultCurrency"
              name="defaultCurrency"
              defaultValue={values?.defaultCurrency ?? "EUR"}
              required
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Quotation number prefix"
            name="quotationPrefix"
            defaultValue={values?.quotationPrefix ?? "QUO"}
            required
          />
          <Field
            label="Expense number prefix"
            name="expensePrefix"
            defaultValue={values?.expensePrefix ?? "EXP"}
            required
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
      />
    </div>
  );
}
