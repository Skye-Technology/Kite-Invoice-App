import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";
import { getCompanyLogoDataUri } from "@/lib/pdf/logo";
import { formatDisplayDate, splitAddressLines, contactAddressLines } from "@/lib/pdf/format";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, company: { users: { some: { userId: session.user.id } } } },
    include: {
      company: true,
      customer: true,
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const logoDataUri = await getCompanyLogoDataUri(invoice.company);

  const buffer = await renderToBuffer(
    <InvoicePdf
      data={{
        invoiceNumber: invoice.invoiceNumber,
        issueDateFormatted: formatDisplayDate(invoice.issueDate.toISOString().slice(0, 10)),
        dueDate: formatDisplayDate(invoice.dueDate.toISOString().slice(0, 10)),
        currency: invoice.currency,
        status: invoice.status,
        notes: invoice.notes,
        subtotal: invoice.subtotal.toString(),
        taxTotal: invoice.taxTotal.toString(),
        totalAmount: invoice.totalAmount.toString(),
        balanceDue: invoice.balanceDue.toString(),
        reverseCharge: invoice.reverseCharge,
        company: {
          name: invoice.company.name,
          addressLines: splitAddressLines(invoice.company.address),
          phone: invoice.company.phone,
          website: invoice.company.website,
          email: invoice.company.email,
          registrationNumber: invoice.company.registrationNumber,
          taxNumber: invoice.company.taxNumber,
          bankAccount: invoice.company.bankAccount,
          logoDataUri,
        },
        customer: {
          name: invoice.customer.name,
          contactPerson: invoice.customer.contactPerson,
          addressLines: contactAddressLines(invoice.customer),
          email: invoice.customer.email,
          reference: invoice.customer.registrationNumber,
        },
        lines: invoice.lines.map((line) => ({
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
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
