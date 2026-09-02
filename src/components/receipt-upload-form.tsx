"use client";

import { useState } from "react";

export function ReceiptUploadForm({ action }: { action: (formData: FormData) => Promise<void> }) {
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
      className="flex items-center gap-3"
    >
      <input
        name="receipt"
        type="file"
        accept="image/*,application/pdf"
        required
        className="block text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload receipt"}
      </button>
    </form>
  );
}
