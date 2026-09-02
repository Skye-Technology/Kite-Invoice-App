"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Company = { id: string; name: string };

export function CompanySwitcher({
  companies,
  currentId,
  setCurrentCompanyId,
}: {
  companies: Company[];
  currentId?: string;
  setCurrentCompanyId: (companyId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <select
      name="companyId"
      defaultValue={currentId}
      onChange={(e) => {
        const companyId = e.target.value;
        startTransition(async () => {
          await setCurrentCompanyId(companyId);
          router.refresh();
        });
      }}
      className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
    >
      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>
  );
}
