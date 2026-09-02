"use client";

import { useState } from "react";
import { LineItemsEditor, emptyLine, type Line } from "@/components/line-items-editor";
import { TimesheetImport } from "@/components/timesheet-import";
import { addDays } from "@/lib/date";
import { CURRENCIES } from "@/lib/currencies";
import type { TimesheetLine } from "@/lib/timesheet-import";

type Customer = { id: string; name: string; defaultCurrency: string; paymentTermsDays: number };

export function InvoiceForm({
  companyId,
  companyCurrency,
  customers,
  action,
  submitLabel,
  parseTimesheetAction,
  initial,
}: {
  companyId: string;
  companyCurrency: string;
  customers: Customer[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  parseTimesheetAction?: (formData: FormData) => Promise<TimesheetLine[]>;
  initial?: {
    customerId: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    notes: string;
    lines: Line[];
    reverseCharge?: boolean;
  };
}) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? customers[0]?.id ?? "");
  // Currency (like due date below) follows the selected customer — only falls back to the
  // company default when no customer is selected at all.
  const initialCustomer = customers.find((c) => c.id === customerId);
  const [currency, setCurrency] = useState(
    initial?.currency ?? initialCustomer?.defaultCurrency ?? companyCurrency
  );
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [emptyLine()]);
  const [pending, setPending] = useState(false);

  // Due date auto-calculates from the selected customer's payment terms — only for new
  // invoices (editing an existing one leaves the saved due date alone until touched).
  const [issueDate, setIssueDate] = useState(
    initial?.issueDate ?? new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ??
      (initialCustomer ? addDays(issueDate, initialCustomer.paymentTermsDays) : "")
  );
  const [dueDateTouched, setDueDateTouched] = useState(Boolean(initial));

  const onCustomerChange = (id: string) => {
    setCustomerId(id);
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;
    setCurrency(customer.defaultCurrency);
    if (!dueDateTouched) setDueDate(addDays(issueDate, customer.paymentTermsDays));
  };

  const onIssueDateChange = (value: string) => {
    setIssueDate(value);
    const customer = customers.find((c) => c.id === customerId);
    if (customer && !dueDateTouched) setDueDate(addDays(value, customer.paymentTermsDays));
  };

  const onImportLines = (imported: Line[]) => {
    setLines((prev) => {
      // Drop a single untouched placeholder row rather than leaving a blank required
      // description field alongside the imported lines.
      const isBlankPlaceholder =
        prev.length === 1 &&
        prev[0].description === "" &&
        prev[0].quantity === "1" &&
        prev[0].unitRate === "0";
      return isBlankPlaceholder ? imported : [...prev, ...imported];
    });
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
            value={issueDate}
            onChange={(e) => onIssueDateChange(e.target.value)}
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
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          {!dueDateTouched && (
            <p className="mt-1 text-xs text-neutral-500">
              Calculated from the customer&apos;s payment terms — edit to override.
            </p>
          )}
        </div>
      </div>

      {parseTimesheetAction && (
        <TimesheetImport parseAction={parseTimesheetAction} onImport={onImportLines} />
      )}

      <LineItemsEditor lines={lines} onChange={setLines} currency={currency} />

      <label className="ml-auto flex w-64 items-center justify-end gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="reverseCharge"
          defaultChecked={initial?.reverseCharge ?? false}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Reverse charge
      </label>

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
