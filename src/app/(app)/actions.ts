"use server";

import { auth } from "@/lib/auth";
import { requireCompanyAccess, setCurrentCompanyCookie } from "@/lib/current-company";

export async function switchCompany(companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  await requireCompanyAccess(session.user.id, companyId);
  await setCurrentCompanyCookie(companyId);
}
