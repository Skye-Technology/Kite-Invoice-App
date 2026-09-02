import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveQuotationStatus } from "@/lib/status";
import { QuotationPdf } from "@/lib/pdf/quotation-pdf";
import { getCompanyLogoDataUri } from "@/lib/pdf/logo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const quotation = await prisma.quotation.findFirst({
    where: { id, company: { users: { some: { userId: session.user.id } } } },
    include: {
      company: true,
      customer: true,
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quotation) return new NextResponse("Not found", { status: 404 });

  const logoDataUri = await getCompanyLogoDataUri(quotation.company);

  const buffer = await renderToBuffer(
    <QuotationPdf
      data={{
        quotationNumber: quotation.quotationNumber,
        issueDate: quotation.issueDate.toISOString().slice(0, 10),
        validUntilDate: quotation.validUntilDate.toISOString().slice(0, 10),
        currency: quotation.currency,
        status: deriveQuotationStatus({
          currentStatus: quotation.status,
          validUntilDate: quotation.validUntilDate,
        }),
        notes: quotation.notes,
        subtotal: quotation.subtotal.toString(),
        taxTotal: quotation.taxTotal.toString(),
        totalAmount: quotation.totalAmount.toString(),
        company: {
          name: quotation.company.name,
          address: quotation.company.address,
          email: quotation.company.email,
          taxNumber: quotation.company.taxNumber,
          logoDataUri,
        },
        customer: {
          name: quotation.customer.name,
          address: quotation.customer.address,
          email: quotation.customer.email,
        },
        lines: quotation.lines.map((line) => ({
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
      "Content-Disposition": `inline; filename="${quotation.quotationNumber}.pdf"`,
    },
  });
}
