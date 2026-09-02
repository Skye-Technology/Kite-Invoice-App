"use client";

import { useRef, useState } from "react";
import type { HistoricalImportResult } from "@/app/(app)/invoices/actions";

export function HistoricalInvoiceImport({
  importAction,
}: {
  importAction: (formData: FormData) => Promise<HistoricalImportResult>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HistoricalImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      setResult(await importAction(formData));
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import file.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-neutral-700">Spreadsheet (.xlsx)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-1 block text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onImport}
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Importing..." : "Import"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-900">
            Imported {result.imported} of {result.imported + result.skipped.length} rows.
          </p>
          {result.skipped.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Row</th>
                    <th className="px-3 py-1.5 font-medium">Invoice #</th>
                    <th className="px-3 py-1.5 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {result.skipped.map((s, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-neutral-500">{s.rowNumber}</td>
                      <td className="px-3 py-1.5 text-neutral-700">{s.invoiceNumber || "—"}</td>
                      <td className="px-3 py-1.5 text-red-600">{s.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
