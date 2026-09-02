"use client";

import { useState } from "react";
import { LineItemsEditor, emptyLine, type Line } from "@/components/line-items-editor";
import { addDays } from "@/lib/date";
import { CURRENCIES } from "@/lib/currencies";

type Customer = { id: string; name: string; defaultCurrency: string };

export function QuotationForm({
  companyId,
  companyCurrency,
  customers,
  action,
  submitLabel,
  initial,
}: {
  companyId: string;
  companyCurrency: string;
  customers: Customer[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initial?: {
    customerId: string;
    issueDate: string;
    validUntilDate: string;
    currency: string;
    notes: string;
    lines: Line[];
  };
}) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? customers[0]?.id ?? "");
  // Currency follows the selected customer — only falls back to the company default when
  // no customer is selected at all.
  const initialCustomer = customers.find((c) => c.id === customerId);
  const [currency, setCurrency] = useState(
    initial?.currency ?? initialCustomer?.defaultCurrency ?? companyCurrency
  );
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [emptyLine()]);
  const [pending, setPending] = useState(false);

  const onCustomerChange = (id: string) => {
    setCustomerId(id);
    const customer = customers.find((c) => c.id === id);
    if (customer) setCurrency(customer.defaultCurrency);
  };

  const defaultValidUntil = () => addDays(new Date().toISOString().slice(0, 10), 30);

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
      className="max-w-3xl space-y-6"
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="linesJson" value={JSON.stringify(lines)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="customerId">
            Customer
          </label>
          <select
            id="customerId"
            name="customerId"
            value={customerId}
            onChange={(e) => onCustomerChange(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="" disabled>
              Select a customer
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">Defaults to the customer&apos;s currency.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="issueDate">
            Issue date
          </label>
          <input
            id="issueDate"
            name="issueDate"
            type="date"
            defaultValue={initial?.issueDate ?? new Date().toISOString().slice(0, 10)}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="validUntilDate">
            Valid until
          </label>
          <input
            id="validUntilDate"
            name="validUntilDate"
            type="date"
            defaultValue={initial?.validUntilDate ?? defaultValidUntil()}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
      </div>

      <LineItemsEditor lines={lines} onChange={setLines} currency={currency} />

      <div>
        <label className="text-sm font-medium text-neutral-700" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes}
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
