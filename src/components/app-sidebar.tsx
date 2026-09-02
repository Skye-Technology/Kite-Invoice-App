"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Wallet,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  contacts: Users,
  quotations: FileText,
  invoices: Receipt,
  expenses: Wallet,
};

export function AppSidebar({
  groups,
  onSignOut,
}: {
  groups: { label: string; items: { href: string; label: string; icon: string; badge?: number }[] }[];
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <Image src="/kite-logo.svg" alt="Kite" width={90} height={32} priority />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              {group.label}
            </p>
            <div className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="size-4" strokeWidth={2} />
                      {item.label}
                    </span>
                    {!!item.badge && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-neutral-200 p-3">
        <Link
          href="/settings/company"
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          }`}
        >
          <SettingsIcon className="size-4" strokeWidth={2} />
          Settings
        </Link>
        <form action={onSignOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            <LogOut className="size-4" strokeWidth={2} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
