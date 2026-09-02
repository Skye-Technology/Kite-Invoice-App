import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { switchCompany } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { companies, current } = await getCurrentCompany(session.user.id);

  const [overdueInvoiceCount, actionableExpenseCount, openQuotationCount] = current
    ? await Promise.all([
        prisma.invoice.count({ where: { companyId: current.id, status: "OVERDUE" } }),
        prisma.expense.count({
          where: { companyId: current.id, status: { in: ["OVERDUE", "PENDING"] } },
        }),
        prisma.quotation.count({ where: { companyId: current.id, status: "SENT" } }),
      ])
    : [0, 0, 0];

  const navGroups = [
    { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: "dashboard" }] },
    { label: "Contacts", items: [{ href: "/contacts", label: "Contacts", icon: "contacts" }] },
    {
      label: "Billing",
      items: [
        {
          href: "/quotations",
          label: "Quotations",
          icon: "quotations",
          badge: openQuotationCount,
        },
        { href: "/invoices", label: "Invoices", icon: "invoices", badge: overdueInvoiceCount },
        { href: "/expenses", label: "Expenses", icon: "expenses", badge: actionableExpenseCount },
      ],
    },
  ];

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AppSidebar groups={navGroups} onSignOut={handleSignOut} />

      <div className="flex flex-1 flex-col">
        <AppTopbar
          companies={companies}
          currentCompanyId={current?.id}
          setCurrentCompanyId={switchCompany}
          userName={session.user.name}
          userEmail={session.user.email}
        />

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
