"use client";

import { useState } from "react";
import { CURRENCIES } from "@/lib/currencies";

export function PaymentForm({
  companyId,
  invoiceId,
  invoiceCurrency,
  action,
}: {
  companyId: string;
  invoiceId: string;
  invoiceCurrency: string;
  action: (formData: FormData) => Promise<void>;
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
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />

      <div>
        <label className="text-xs font-medium text-neutral-700">Date</label>
        <input
          type="date"
          name="paymentDate"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-700">Amount</label>
        <input
          type="number"
          step="0.01"
          name="amount"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-700">Currency</label>
        <select
          name="currency"
          defaultValue={invoiceCurrency}
          required
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-700">
          FX rate (to {invoiceCurrency})
        </label>
        <input
          type="number"
          step="0.000001"
          name="exchangeRate"
          defaultValue="1"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-700">Method</label>
        <input
          name="paymentMethod"
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-700">Reference</label>
        <input
          name="referenceNumber"
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="col-span-2 sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Recording..." : "Record payment"}
        </button>
      </div>
    </form>
  );
}
