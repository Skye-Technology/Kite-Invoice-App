"use client";

import { useState } from "react";

export function NextInvoiceNumberForm({
  currentNext,
  year,
  action,
}: {
  currentNext: number;
  year: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [value, setValue] = useState(currentNext);
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
      className="flex items-end gap-3"
    >
      <div>
        <label className="text-sm font-medium text-neutral-700" htmlFor="nextInvoiceNumber">
          Next invoice number
        </label>
        <input
          id="nextInvoiceNumber"
          name="nextInvoiceNumber"
          type="number"
          min={1}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          required
          className="mt-1 w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Will be issued as {year}-{String(value || 0).padStart(4, "0")}
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
