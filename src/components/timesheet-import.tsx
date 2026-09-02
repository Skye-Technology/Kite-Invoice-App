"use client";

import { useRef, useState } from "react";
import type { Line } from "@/components/line-items-editor";
import type { TimesheetLine } from "@/lib/timesheet-import";

export function TimesheetImport({
  parseAction,
  onImport,
}: {
  parseAction: (formData: FormData) => Promise<TimesheetLine[]>;
  onImport: (lines: Line[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<TimesheetLine[] | null>(null);
  const [defaultRate, setDefaultRate] = useState("0");
  const [defaultTaxRate, setDefaultTaxRate] = useState("0.21");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalHours = parsed?.reduce((sum, l) => sum + Number(l.quantity), 0) ?? 0;

  // A plain button + manual FormData, not a nested <form> — this component renders inside
  // InvoiceForm's own <form>, and HTML doesn't allow nested forms (the browser flattens
  // them, which breaks React's form-action instrumentation and throws at submit time).
  const onParse = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a timesheet file first.");
      return;
    }

    setPending(true);
    setError(null);
    setParsed(null);
    try {
      const formData = new FormData();
      formData.set("timesheet", file);
      const result = await parseAction(formData);
      if (result.length === 0) {
        setError("No time entries found in that file.");
      } else {
        setParsed(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse timesheet.");
    } finally {
      setPending(false);
    }
  };

  const addToInvoice = () => {
    if (!parsed) return;
    onImport(
      parsed.map((entry) => ({
        description: entry.description,
        quantity: entry.quantity,
        unitRate: defaultRate || "0",
        taxRate: defaultTaxRate,
      }))
    );
    setOpen(false);
    setParsed(null);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-neutral-600 underline hover:text-neutral-900"
      >
        Import from timesheet (.xlsx)
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">Import from timesheet</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setParsed(null);
            setError(null);
          }}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-neutral-700">Timesheet file</label>
          <input
            ref={fileInputRef}
            name="timesheet"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-1 block text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-700">Rate per hour</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={defaultRate}
            onChange={(e) => setDefaultRate(e.target.value)}
            className="mt-1 w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-700">Tax rate</label>
          <select
            value={defaultTaxRate}
            onChange={(e) => setDefaultTaxRate(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
          >
            <option value="0">0%</option>
            <option value="0.09">9%</option>
            <option value="0.21">21%</option>
          </select>
        </div>
        <button
          type="button"
          onClick={onParse}
          disabled={pending}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? "Parsing..." : "Parse file"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {parsed && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            {parsed.length} entries, {totalHours.toFixed(2)} hours total. Review below, then add
            to the invoice — every line stays editable afterward.
          </p>
          <div className="max-h-64 overflow-y-auto rounded-md border border-neutral-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Date</th>
                  <th className="px-2 py-1.5 font-medium">Description</th>
                  <th className="px-2 py-1.5 text-right font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {parsed.map((line, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-2 py-1.5 text-neutral-500">{line.date}</td>
                    <td className="px-2 py-1.5">{line.description}</td>
                    <td className="px-2 py-1.5 text-right">{line.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addToInvoice}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add {parsed.length} lines to invoice
          </button>
        </div>
      )}
    </div>
  );
}
