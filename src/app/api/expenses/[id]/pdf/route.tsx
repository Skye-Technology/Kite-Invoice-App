import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpensePdf } from "@/lib/pdf/expense-pdf";
import { getCompanyLogoDataUri } from "@/lib/pdf/logo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const expense = await prisma.expense.findFirst({
    where: { id, company: { users: { some: { userId: session.user.id } } } },
    include: {
      company: true,
      vendor: true,
      category: true,
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!expense) return new NextResponse("Not found", { status: 404 });

  const logoDataUri = await getCompanyLogoDataUri(expense.company);

  const buffer = await renderToBuffer(
    <ExpensePdf
      data={{
        expenseNumber: expense.expenseNumber,
        expenseDate: expense.expenseDate.toISOString().slice(0, 10),
        dueDate: expense.dueDate ? expense.dueDate.toISOString().slice(0, 10) : null,
        currency: expense.currency,
        status: expense.status,
        description: expense.description,
        notes: expense.notes,
        subtotal: expense.subtotal.toString(),
        taxTotal: expense.taxTotal.toString(),
        totalAmount: expense.totalAmount.toString(),
        balanceDue: expense.balanceDue.toString(),
        paymentMethod: expense.paymentMethod,
        referenceNumber: expense.referenceNumber,
        company: {
          name: expense.company.name,
          address: expense.company.address,
          email: expense.company.email,
          taxNumber: expense.company.taxNumber,
          logoDataUri,
        },
        vendor: expense.vendor
          ? {
              name: expense.vendor.name,
              address: expense.vendor.address,
              email: expense.vendor.email,
            }
          : null,
        category: expense.category?.name ?? null,
        lines: expense.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity.toString(),
          unitRate: line.unitRate.toString(),
          taxRate: line.taxRate.toString(),
          lineAmount: line.lineAmount.toString(),
        })),
      }}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${expense.expenseNumber}.pdf"`,
    },
  });
}
