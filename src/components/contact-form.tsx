"use client";

import { useState } from "react";
import { CURRENCIES } from "@/lib/currencies";

type ContactFormValues = {
  name?: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  registrationNumber?: string | null;
  website?: string | null;
  defaultCurrency: string;
  paymentTermsDays: number;
  notes?: string | null;
};

export function ContactForm({
  companyId,
  values,
  action,
  submitLabel,
}: {
  companyId: string;
  values?: ContactFormValues;
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
      <input type="hidden" name="companyId" value={companyId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={values?.name ?? ""} required />
        <div className="flex items-end gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="isCustomer"
              defaultChecked={values?.isCustomer ?? false}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Customer
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="isSupplier"
              defaultChecked={values?.isSupplier ?? false}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Supplier
          </label>
        </div>
        <Field label="Contact person" name="contactPerson" defaultValue={values?.contactPerson ?? ""} />
        <Field label="Email" name="email" type="email" defaultValue={values?.email ?? ""} />
        <Field label="Phone" name="phone" defaultValue={values?.phone ?? ""} />
        <Field label="Website" name="website" defaultValue={values?.website ?? ""} />
        <Field
          label="Registration number"
          name="registrationNumber"
          defaultValue={values?.registrationNumber ?? ""}
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-neutral-700">Address</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Address" name="address" defaultValue={values?.address ?? ""} />
          <Field label="City" name="city" defaultValue={values?.city ?? ""} />
          <Field label="Postal code" name="postalCode" defaultValue={values?.postalCode ?? ""} />
          <Field label="Country" name="country" defaultValue={values?.country ?? ""} />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Payment terms (days)"
          name="paymentTermsDays"
          type="number"
          defaultValue={String(values?.paymentTermsDays ?? 14)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700">Notes</label>
        <textarea
          name="notes"
          defaultValue={values?.notes ?? ""}
          rows={3}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

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
