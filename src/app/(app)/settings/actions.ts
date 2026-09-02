"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess, setCurrentCompanyCookie } from "@/lib/current-company";
import { buildStorageKey, uploadObject, deleteObject } from "@/lib/storage";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/default-expense-categories";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  bankAccount: z.string().optional(),
  defaultCurrency: z.string().min(3).max(3),
  expensePrefix: z.string().min(1),
  quotationPrefix: z.string().min(1),
});

export async function updateCompany(companyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const data = companySchema.parse(Object.fromEntries(formData.entries()));

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.name,
      address: data.address || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      registrationNumber: data.registrationNumber || null,
      taxNumber: data.taxNumber || null,
      bankAccount: data.bankAccount || null,
      defaultCurrency: data.defaultCurrency.toUpperCase(),
      expensePrefix: data.expensePrefix.toUpperCase(),
      quotationPrefix: data.quotationPrefix.toUpperCase(),
    },
  });

  revalidatePath("/settings/company");
  revalidatePath("/");
}

export async function createCompany(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const data = companySchema.parse(Object.fromEntries(formData.entries()));

  const company = await prisma.company.create({
    data: {
      name: data.name,
      address: data.address || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      registrationNumber: data.registrationNumber || null,
      taxNumber: data.taxNumber || null,
      bankAccount: data.bankAccount || null,
      defaultCurrency: data.defaultCurrency.toUpperCase(),
      expensePrefix: data.expensePrefix.toUpperCase(),
      quotationPrefix: data.quotationPrefix.toUpperCase(),
      users: { create: { userId: session.user.id, isDefault: false } },
      expenseCategories: {
        create: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
          name: c.name,
          icon: c.icon,
          vatDeductible: c.vatDeductible,
          isDefault: true,
        })),
      },
    },
  });

  await setCurrentCompanyCookie(company.id);

  revalidatePath("/");
  redirect("/settings/company");
}

/**
 * Sets which invoice number gets issued next (e.g. entering 9 makes the next invoice
 * "{year}-0009"). Stores value-1 in invoiceNumberSeq, since nextInvoiceNumber() increments
 * before formatting — lets a migration continue an existing external sequence (e.g. from
 * Gekko) instead of restarting at 1. Deliberately a separate action from updateCompany so
 * it isn't accidentally reset by an unrelated settings save.
 */
export async function setNextInvoiceNumber(companyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const next = z.coerce.number().int().min(1).parse(formData.get("nextInvoiceNumber"));

  await prisma.company.update({
    where: { id: companyId },
    data: { invoiceNumberSeq: next - 1 },
  });

  revalidatePath("/settings/company");
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
// SVG is stored and used on-screen as-is (crisp at any size); @react-pdf/renderer's
// <Image> can't render SVG directly, so it's rasterized to PNG at PDF-generation time
// only (see lib/pdf/logo.ts) — the original vector file is never lossily converted here.
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function uploadCompanyLogo(companyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a logo file.");
  if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be under 2MB.");
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    throw new Error("Logo must be a PNG, JPEG, WebP, or SVG image.");
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

  const key = buildStorageKey(`logos/${companyId}`, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject({ key, body: buffer, contentType: file.type });

  if (company.logoStorageKey) {
    await deleteObject(company.logoStorageKey).catch(() => {});
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { logoStorageKey: key, logoContentType: file.type },
  });

  revalidatePath("/settings/company");
}

export async function removeCompanyLogo(companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  await requireCompanyAccess(session.user.id, companyId);

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  if (company.logoStorageKey) {
    await deleteObject(company.logoStorageKey).catch(() => {});
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { logoStorageKey: null, logoContentType: null },
  });

  revalidatePath("/settings/company");
}
