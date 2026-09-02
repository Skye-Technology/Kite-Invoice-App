"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/current-company";

const contactSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  isCustomer: z.string().optional(),
  isSupplier: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  registrationNumber: z.string().optional(),
  website: z.string().optional(),
  defaultCurrency: z.string().min(3).max(3),
  paymentTermsDays: z.coerce.number().int().min(0),
  notes: z.string().optional(),
});

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = contactSchema.parse(raw);
  const isCustomer = parsed.isCustomer === "on";
  const isSupplier = parsed.isSupplier === "on";
  if (!isCustomer && !isSupplier) {
    throw new Error("A contact must be marked as a customer, a supplier, or both.");
  }
  return { ...parsed, isCustomer, isSupplier };
}

export async function createContact(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const data = parseForm(formData);
  await requireCompanyAccess(session.user.id, data.companyId);

  await prisma.contact.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      isCustomer: data.isCustomer,
      isSupplier: data.isSupplier,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      registrationNumber: data.registrationNumber || null,
      website: data.website || null,
      defaultCurrency: data.defaultCurrency,
      paymentTermsDays: data.paymentTermsDays,
      notes: data.notes || null,
    },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function updateContact(contactId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const data = parseForm(formData);
  await requireCompanyAccess(session.user.id, data.companyId);

  await prisma.contact.update({
    where: { id: contactId, companyId: data.companyId },
    data: {
      name: data.name,
      isCustomer: data.isCustomer,
      isSupplier: data.isSupplier,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      registrationNumber: data.registrationNumber || null,
      website: data.website || null,
      defaultCurrency: data.defaultCurrency,
      paymentTermsDays: data.paymentTermsDays,
      notes: data.notes || null,
    },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContact(contactId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  await requireCompanyAccess(session.user.id, companyId);
  await prisma.contact.delete({ where: { id: contactId, companyId } });

  revalidatePath("/contacts");
}
