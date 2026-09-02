import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { CompanySwitcher } from "@/components/company-switcher";
import { switchCompany } from "./actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/quotations", label: "Quotations" },
  { href: "/invoices", label: "Invoices" },
  { href: "/expenses", label: "Expenses" },
  { href: "/settings/company", label: "Settings" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { companies, current } = await getCurrentCompany(session.user.id);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <Image src="/kite-logo.svg" alt="Kite" width={100} height={35} priority />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-3">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
          {companies.length > 0 ? (
            <CompanySwitcher
              companies={companies}
              currentId={current?.id}
              setCurrentCompanyId={switchCompany}
            />
          ) : (
            <span className="text-sm text-neutral-500">No companies yet</span>
          )}

          <span className="text-sm text-neutral-500">{session.user.email}</span>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
