"use client";

import { useState } from "react";
import { LineItemsEditor, emptyLine, type Line } from "@/components/line-items-editor";
import { addDays } from "@/lib/date";
import { CURRENCIES } from "@/lib/currencies";

type Vendor = { id: string; name: string; defaultCurrency: string; paymentTermsDays: number };
type Category = { id: string; name: string };

export function ExpenseForm({
  companyId,
  companyCurrency,
  vendors,
  categories,
  action,
  submitLabel,
  initial,
}: {
  companyId: string;
  companyCurrency: string;
  vendors: Vendor[];
  categories: Category[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initial?: {
    vendorId: string;
    categoryId: string;
    expenseDate: string;
    dueDate: string;
    currency: string;
    description: string;
    paymentMethod: string;
    referenceNumber: string;
    notes: string;
    reimbursable: boolean;
    lines: Line[];
  };
}) {
  const [vendorId, setVendorId] = useState(initial?.vendorId ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? companyCurrency);
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [emptyLine()]);
  const [pending, setPending] = useState(false);

  // Due date auto-calculates from the selected vendor's payment terms — only for new
  // expenses (editing an existing one leaves the saved due date alone until touched).
  const initialVendor = vendors.find((v) => v.id === vendorId);
  const [expenseDate, setExpenseDate] = useState(
    initial?.expenseDate ?? new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ??
      (initialVendor ? addDays(expenseDate, initialVendor.paymentTermsDays) : "")
  );
  const [dueDateTouched, setDueDateTouched] = useState(Boolean(initial));

  const onVendorChange = (id: string) => {
    setVendorId(id);
    const vendor = vendors.find((v) => v.id === id);
    if (!vendor) return;
    setCurrency(vendor.defaultCurrency);
    if (!dueDateTouched) setDueDate(addDays(expenseDate, vendor.paymentTermsDays));
  };

  const onExpenseDateChange = (value: string) => {
    setExpenseDate(value);
    const vendor = vendors.find((v) => v.id === vendorId);
    if (vendor && !dueDateTouched) setDueDate(addDays(value, vendor.paymentTermsDays));
  };

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

      <div>
        <label className="text-sm font-medium text-neutral-700" htmlFor="description">
          Description
        </label>
        <input
          id="description"
          name="description"
          defaultValue={initial?.description}
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="vendorId">
            Vendor
          </label>
          <select
            id="vendorId"
            name="vendorId"
            value={vendorId}
            onChange={(e) => onVendorChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="">No vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="categoryId">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={initial?.categoryId ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="">No category</option>
            {categories.map((c) => (
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
          <p className="mt-1 text-xs text-neutral-500">Defaults to the vendor&apos;s currency.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="paymentMethod">
            Payment method
          </label>
          <input
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={initial?.paymentMethod}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="expenseDate">
            Expense date
          </label>
          <input
            id="expenseDate"
            name="expenseDate"
            type="date"
            value={expenseDate}
            onChange={(e) => onExpenseDateChange(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="dueDate">
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              setDueDateTouched(true);
            }}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          {!dueDateTouched && vendorId && (
            <p className="mt-1 text-xs text-neutral-500">
              Calculated from the vendor&apos;s payment terms — edit to override.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="referenceNumber">
            Reference number
          </label>
          <input
            id="referenceNumber"
            name="referenceNumber"
            defaultValue={initial?.referenceNumber}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="reimbursable"
            defaultChecked={initial?.reimbursable}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Reimbursable
        </label>
      </div>

      <LineItemsEditor lines={lines} onChange={setLines} currency={currency} />

      <div>
        <label className="text-sm font-medium text-neutral-700" htmlFor="receipt">
          Receipt {initial ? "(replace / add another)" : ""}
        </label>
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="mt-1 block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
        />
      </div>

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
