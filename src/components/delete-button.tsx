"use client";

import { useTransition } from "react";

export function DeleteButton({
  action,
  confirmMessage = "Are you sure? This cannot be undone.",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmMessage)) return;
        startTransition(action);
      }}
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}
