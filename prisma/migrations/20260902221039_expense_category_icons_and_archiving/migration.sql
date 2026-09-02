-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "icon" TEXT NOT NULL DEFAULT '❓',
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBalanceSheet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatDeductible" BOOLEAN NOT NULL DEFAULT true;
