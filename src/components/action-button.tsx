"use client";

import { useTransition } from "react";

export function ActionButton({
  action,
  label,
  pendingLabel,
  confirmMessage,
  variant = "default",
}: {
  action: () => Promise<void>;
  label: string;
  pendingLabel?: string;
  confirmMessage?: string;
  variant?: "default" | "danger";
}) {
  const [pending, startTransition] = useTransition();

  const className =
    variant === "danger"
      ? "rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      : "rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirmMessage && !confirm(confirmMessage)) return;
        startTransition(action);
      }}
      className={className}
    >
      {pending ? (pendingLabel ?? "Working...") : label}
    </button>
  );
}
