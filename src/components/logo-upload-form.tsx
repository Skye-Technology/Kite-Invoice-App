"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action-button";

export function LogoUploadForm({
  currentLogoUrl,
  uploadAction,
  removeAction,
}: {
  currentLogoUrl: string | null;
  uploadAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {currentLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentLogoUrl}
          alt="Company logo"
          className="h-16 w-32 rounded border border-neutral-200 bg-white object-contain p-1"
        />
      ) : (
        <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-neutral-300 text-xs text-neutral-400">
          No logo
        </div>
      )}

      <form
        action={async (formData) => {
          setPending(true);
          try {
            await uploadAction(formData);
          } finally {
            setPending(false);
          }
        }}
        className="flex items-center gap-2"
      >
        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          required
          className="block text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? "Uploading..." : currentLogoUrl ? "Replace" : "Upload"}
        </button>
      </form>

      {currentLogoUrl && (
        <ActionButton
          action={removeAction}
          label="Remove"
          variant="danger"
          confirmMessage="Remove the company logo?"
        />
      )}
    </div>
  );
}
