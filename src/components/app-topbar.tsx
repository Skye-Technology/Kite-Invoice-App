"use client";

import { usePathname } from "next/navigation";
import { CompanySwitcher } from "@/components/company-switcher";

type Company = { id: string; name: string };

const PAGE_TITLES: { href: string; label: string }[] = [
  { href: "/settings", label: "Settings" },
  { href: "/contacts", label: "Contacts" },
  { href: "/quotations", label: "Quotations" },
  { href: "/invoices", label: "Invoices" },
  { href: "/expenses", label: "Expenses" },
  { href: "/", label: "Dashboard" },
];

function currentPageLabel(pathname: string) {
  const match = PAGE_TITLES.find((page) => (page.href === "/" ? pathname === "/" : pathname.startsWith(page.href)));
  return match?.label ?? "Dashboard";
}

export function AppTopbar({
  companies,
  currentCompanyId,
  setCurrentCompanyId,
  userName,
  userEmail,
}: {
  companies: Company[];
  currentCompanyId?: string;
  setCurrentCompanyId: (companyId: string) => Promise<void>;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
}) {
  const pathname = usePathname();
  const pageLabel = currentPageLabel(pathname);
  const displayName = userName || userEmail || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-400">Dashboard</span>
        <span className="text-neutral-300">/</span>
        <span className="font-medium text-neutral-900">{pageLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        {companies.length > 0 ? (
          <CompanySwitcher
            companies={companies}
            currentId={currentCompanyId}
            setCurrentCompanyId={setCurrentCompanyId}
          />
        ) : (
          <span className="text-sm text-neutral-500">No companies yet</span>
        )}

        <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-4">
          <span className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
            {initial}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-neutral-900">{displayName}</p>
            {userName && <p className="text-xs text-neutral-500">{userEmail}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}
