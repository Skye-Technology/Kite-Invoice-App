import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "kite_company_id";

/**
 * Resolves which company the current request should operate on: the cookie value if it's
 * still one the user has access to, otherwise their default (or first) company.
 */
export async function getCurrentCompany(userId: string) {
  const companies = await prisma.company.findMany({
    where: { users: { some: { userId } } },
    orderBy: { name: "asc" },
  });

  if (companies.length === 0) return { companies, current: null };

  const cookieStore = await cookies();
  const cookieCompanyId = cookieStore.get(COOKIE_NAME)?.value;

  const current =
    companies.find((c) => c.id === cookieCompanyId) ??
    companies.find((c) => c.id === companies[0].id) ??
    companies[0];

  return { companies, current };
}

export async function setCurrentCompanyCookie(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Asserts the company belongs to the user and returns it, or throws. Use in server actions
 * before any write so requests can't be replayed against a company the session doesn't own.
 */
export async function requireCompanyAccess(userId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, users: { some: { userId } } },
  });
  if (!company) throw new Error("Company not found or access denied.");
  return company;
}
