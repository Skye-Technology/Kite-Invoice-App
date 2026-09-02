import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/current-company";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/delete-button";
import { deleteContact } from "./actions";

const TABS = [
  { key: "all", label: "All" },
  { key: "customers", label: "Customers" },
  { key: "suppliers", label: "Suppliers" },
] as const;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const activeTab = role === "customers" || role === "suppliers" ? role : "all";

  const session = await auth();
  if (!session?.user) redirect("/login");

  const { current } = await getCurrentCompany(session.user.id);
  if (!current) return <p className="text-sm text-neutral-500">No company selected.</p>;

  const where =
    activeTab === "customers"
      ? { companyId: current.id, isCustomer: true }
      : activeTab === "suppliers"
        ? { companyId: current.id, isSupplier: true }
        : { companyId: current.id };

  const contacts = await prisma.contact.findMany({ where, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">Contacts</h2>
        <Link
          href="/contacts/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          New contact
        </Link>
      </div>

      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/contacts" : `/contacts?role=${tab.key}`}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-neutral-500">No contacts yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Currency</th>
                <th className="px-4 py-2 font-medium">Terms</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    <Link href={`/contacts/${contact.id}`} className="hover:underline">
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    <div className="flex gap-1">
                      {contact.isCustomer && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Customer
                        </span>
                      )}
                      {contact.isSupplier && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Supplier
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {contact.email || contact.contactPerson || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{contact.defaultCurrency}</td>
                  <td className="px-4 py-3 text-neutral-600">{contact.paymentTermsDays}d</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton
                      action={deleteContact.bind(null, contact.id, current.id)}
                      confirmMessage={`Delete contact "${contact.name}"?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
