import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_EXPENSE_CATEGORIES } from "../src/lib/default-expense-categories";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.KITE_OPERATOR_EMAIL ?? "operator@example.com";
  const password = process.env.KITE_SEED_PASSWORD ?? "changeme";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Operator",
      email,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  const company = await prisma.company.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      name: "Your Company",
      defaultCurrency: "EUR",
      invoicePrefix: "INV",
      expensePrefix: "EXP",
    },
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: {},
    create: { userId: user.id, companyId: company.id, isDefault: true },
  });

  const existingDefaultCategoryCount = await prisma.expenseCategory.count({
    where: { companyId: company.id, isDefault: true },
  });
  if (existingDefaultCategoryCount === 0) {
    await prisma.expenseCategory.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        companyId: company.id,
        name: c.name,
        icon: c.icon,
        vatDeductible: c.vatDeductible,
        isDefault: true,
      })),
    });
  }

  console.log(`Seeded operator ${email} with company "${company.name}".`);
  if (!process.env.KITE_SEED_PASSWORD) {
    console.log(`Default password is "changeme" — set KITE_SEED_PASSWORD to override.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
