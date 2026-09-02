"use client";

import { useMemo } from "react";
import { computeTotals } from "@/lib/money";

// Dutch VAT rates — standard (21%), reduced (9%), and zero-rated/exempt (0%).
const VAT_RATES = [
  { label: "0%", value: "0" },
  { label: "9%", value: "0.09" },
  { label: "21%", value: "0.21" },
  { label: "VAT exempt", value: "0" },
];

export type Line = {
  description: string;
  quantity: string;
  unitRate: string;
  taxRate: string;
};

export const emptyLine = (): Line => ({
  description: "",
  quantity: "1",
  unitRate: "0",
  taxRate: "0",
});

// Formats the gross (inc-VAT) display value for the "inclusive" amount mode — trims trailing
// zeros from the raw computation so the field doesn't jitter (e.g. "50" vs "50.00") while the
// user is still typing, but still rounds to cents for display.
function grossRateDisplay(unitRate: string, taxRate: string): string {
  const gross = Number(unitRate || 0) * (1 + Number(taxRate || 0));
  return gross === 0 ? "" : gross.toFixed(2);
}

export function LineItemsEditor({
  lines,
  onChange,
  currency,
  amountMode = "exclusive",
}: {
  lines: Line[];
  onChange: (lines: Line[]) => void;
  currency: string;
  // "exclusive" (default): the Rate column is the ex-VAT unit price, tax is added on top —
  // correct for invoicing, where you set your price and VAT is charged in addition.
  // "inclusive": the Rate column is the gross (inc-VAT) amount, matching how expense receipts
  // are read — you see a total on the receipt, not a pre-tax price. Line.unitRate is always
  // stored ex-VAT either way (that's what computeTotals/the DB expect); "inclusive" mode just
  // converts what the user types into that same underlying net value.
  amountMode?: "exclusive" | "inclusive";
}) {
  const totals = useMemo(
    () =>
      computeTotals(
        lines.map((l) => ({
          quantity: l.quantity || "0",
          unitRate: l.unitRate || "0",
          taxRate: l.taxRate || "0",
        }))
      ),
    [lines]
  );

  const updateLine = (index: number, patch: Partial<Line>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    onChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">Line items</p>
        <button
          type="button"
          onClick={() => onChange([...lines, emptyLine()])}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          + Add line
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="w-20 px-3 py-2 font-medium">Qty</th>
              <th className="w-28 px-3 py-2 font-medium">
                {amountMode === "inclusive" ? "Amount (inc. VAT)" : "Rate"}
              </th>
              <th className="w-24 px-3 py-2 font-medium">Tax</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {lines.map((line, index) => {
              const amount = Number(line.quantity || 0) * Number(line.unitRate || 0);
              return (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                      required
                      placeholder="Description"
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={
                        amountMode === "inclusive"
                          ? grossRateDisplay(line.unitRate, line.taxRate)
                          : line.unitRate
                      }
                      onChange={(e) => {
                        if (amountMode === "inclusive") {
                          const net = Number(e.target.value || 0) / (1 + Number(line.taxRate || 0));
                          updateLine(index, { unitRate: net.toFixed(2) });
                        } else {
                          updateLine(index, { unitRate: e.target.value });
                        }
                      }}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={line.taxRate}
                      onChange={(e) => {
                        // In inclusive mode, changing the VAT rate should keep the gross
                        // amount the user typed stable (it's what the receipt says) and
                        // recompute the underlying net unitRate instead of the reverse.
                        if (amountMode === "inclusive") {
                          const gross = Number(line.unitRate || 0) * (1 + Number(line.taxRate || 0));
                          const net = gross / (1 + Number(e.target.value || 0));
                          updateLine(index, { taxRate: e.target.value, unitRate: net.toFixed(2) });
                        } else {
                          updateLine(index, { taxRate: e.target.value });
                        }
                      }}
                      className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-500"
                    >
                      {VAT_RATES.map((rate) => (
                        <option key={rate.label} value={rate.value}>
                          {rate.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-600">{amount.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-neutral-400 hover:text-red-600"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal</span>
          <span>{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>Tax</span>
          <span>{totals.taxTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium text-neutral-900">
          <span>Total</span>
          <span>
            {currency} {totals.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
