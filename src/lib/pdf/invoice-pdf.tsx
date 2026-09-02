import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { styles, PAGE_MARGIN } from "./styles";
import { formatQuantity, groupVatByRate } from "./format";
import { paginateLinesByHeight } from "./paginate";
import { estimateTextLines } from "./text-measure";
import { PoweredByFooter } from "./powered-by";
import { RunningHeader } from "./running-header";

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDateFormatted: string;
  dueDate: string;
  currency: string;
  status: string;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  totalAmount: string;
  balanceDue: string;
  reverseCharge: boolean;
  company: {
    name: string;
    addressLines: string[];
    phone: string | null;
    website: string | null;
    email: string | null;
    registrationNumber: string | null;
    taxNumber: string | null;
    bankAccount: string | null;
    logoDataUri: string | null;
  };
  customer: {
    name: string;
    contactPerson: string | null;
    addressLines: string[];
    email: string | null;
    reference: string | null;
  };
  lines: {
    description: string;
    quantity: string;
    unitRate: string;
    taxRate: string;
    lineAmount: string;
  }[];
};

// Derived from styles.ts layout constants (page height 842pt A4, minus PAGE_MARGIN top/
// bottom, minus the letterhead/parties/totals blocks' measured heights), then given a 10%
// safety margin against text-wrap estimation error — see paginate.ts and text-measure.ts.
const PAGE_HEIGHT = 842;
const ROW_FONT_SIZE = 9.5;
const ROW_LINE_HEIGHT = 12;
const ROW_PADDING_VERTICAL = 9;
const A4_WIDTH = 595;
const ROW_PADDING_HORIZONTAL = 10.5;
const TABLE_CONTENT_WIDTH = A4_WIDTH - PAGE_MARGIN.left * 2 - ROW_PADDING_HORIZONTAL * 2;
const DESCRIPTION_COLUMN_WIDTH = TABLE_CONTENT_WIDTH * (4.6 / 8.2); // matches colDescription's flex share

const SAFETY_FACTOR = 0.9;
const AVAILABLE_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN.top - PAGE_MARGIN.bottom;
const HEADER_PARTIES_HEIGHT = 423; // letterhead + bill-to + invoice-meta blocks (page 1 only)
const RUNNING_HEADER_HEIGHT = 28; // small running header + its margin (continuation pages)
const TOTALS_HEIGHT = 118; // totals box + its top margin

const PAGE_BUDGETS = {
  single: (AVAILABLE_HEIGHT - HEADER_PARTIES_HEIGHT - TOTALS_HEIGHT) * SAFETY_FACTOR,
  first: (AVAILABLE_HEIGHT - HEADER_PARTIES_HEIGHT) * SAFETY_FACTOR,
  mid: (AVAILABLE_HEIGHT - RUNNING_HEADER_HEIGHT) * SAFETY_FACTOR,
  last: (AVAILABLE_HEIGHT - RUNNING_HEADER_HEIGHT - TOTALS_HEIGHT) * SAFETY_FACTOR,
};

function estimatedRowHeight(description: string): number {
  const lines = estimateTextLines(description, DESCRIPTION_COLUMN_WIDTH, ROW_FONT_SIZE);
  return lines * ROW_LINE_HEIGHT + ROW_PADDING_VERTICAL * 2;
}

function TableHeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]} wrap={false}>
      <Text style={[styles.colQty, styles.label]}>Quantity</Text>
      <Text style={[styles.colDescription, styles.label]}>Description</Text>
      <Text style={[styles.colRate, styles.label]}>Unit price (Ex. VAT)</Text>
      <Text style={[styles.colAmount, styles.label]}>Total (Ex. VAT)</Text>
      <Text style={[styles.colTax, styles.label]}>VAT</Text>
    </View>
  );
}

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const pages = paginateLinesByHeight(data.lines, {
    rowHeight: (line) => estimatedRowHeight(line.description),
    budgets: PAGE_BUDGETS,
  });
  const vatGroups = groupVatByRate(data.lines);
  const docLabel = `Invoice ${data.invoiceNumber}`;

  return (
    <Document>
      {pages.map((pageLines, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === pages.length - 1;

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {isFirstPage ? (
              <>
                <View style={styles.docHeader}>
                  <View>
                    {data.company.logoDataUri && (
                      // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
                      <Image src={data.company.logoDataUri} style={styles.logo} />
                    )}
                  </View>

                  <View style={styles.companyBlock}>
                    <Text style={styles.companyName}>{data.company.name}</Text>
                    {data.company.addressLines.map((line, i) => (
                      <Text style={styles.companyLine} key={i}>
                        {line}
                      </Text>
                    ))}
                    {data.company.phone && (
                      <Text style={styles.companyLine}>{data.company.phone}</Text>
                    )}
                    {data.company.website && (
                      <Text style={styles.companyLine}>{data.company.website}</Text>
                    )}
                    {data.company.email && (
                      <Text style={styles.companyLine}>{data.company.email}</Text>
                    )}
                    {data.company.registrationNumber && (
                      <Text style={styles.companyLine}>KVK {data.company.registrationNumber}</Text>
                    )}
                    {data.company.taxNumber && (
                      <Text style={styles.companyLine}>BTW {data.company.taxNumber}</Text>
                    )}
                    {data.company.bankAccount && (
                      <Text style={styles.companyLine}>IBAN {data.company.bankAccount}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.parties}>
                  <View style={styles.billTo}>
                    <Text style={styles.billToName}>{data.customer.name}</Text>
                    {data.customer.contactPerson && (
                      <Text style={styles.billToLine}>{data.customer.contactPerson}</Text>
                    )}
                    {data.customer.addressLines.map((line, i) => (
                      <Text style={styles.billToLine} key={i}>
                        {line}
                      </Text>
                    ))}
                    {data.customer.email && (
                      <Text style={styles.billToLine}>{data.customer.email}</Text>
                    )}
                    {data.customer.reference && (
                      <Text style={styles.billToLine}>{data.customer.reference}</Text>
                    )}
                  </View>

                  <View style={styles.invoiceMeta}>
                    <Text style={styles.docNumber}>{docLabel}</Text>
                    <View style={styles.dateBlock}>
                      <Text style={styles.dateLine}>{data.issueDateFormatted}</Text>
                      <Text style={styles.dateSubLine}>Payment due: {data.dueDate}</Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <RunningHeader docLabel={docLabel} companyName={data.company.name} />
            )}

            <View style={styles.table}>
              <TableHeaderRow />
              {pageLines.map((line, i) => (
                <View
                  style={[styles.row, i % 2 === 1 ? styles.zebraRow : undefined]}
                  wrap={false}
                  key={i}
                >
                  <Text style={styles.colQty}>{formatQuantity(line.quantity)}</Text>
                  <Text style={styles.colDescription}>{line.description}</Text>
                  <Text style={styles.colRate}>{Number(line.unitRate).toFixed(2)}</Text>
                  <Text style={styles.colAmount}>{Number(line.lineAmount).toFixed(2)}</Text>
                  <Text style={styles.colTax}>{(Number(line.taxRate) * 100).toFixed(1)}%</Text>
                </View>
              ))}
            </View>

            {isLastPage && (
              <>
                <View style={styles.totals} wrap={false}>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Subtotal</Text>
                    <Text>
                      {data.currency} {Number(data.subtotal).toFixed(2)}
                    </Text>
                  </View>
                  {vatGroups.map((group) => (
                    <View style={styles.totalsRow} key={group.rate}>
                      <Text style={styles.totalsLabel}>
                        {(Number(group.rate) * 100).toFixed(2)}% VAT
                      </Text>
                      <Text>
                        {data.currency} {group.amount.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  {data.reverseCharge && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>VAT reverse-charged to recipient</Text>
                    </View>
                  )}
                  <View style={[styles.totalsRow, styles.grandTotal]}>
                    <Text style={styles.totalsLabel}>Total</Text>
                    <Text>
                      {data.currency} {Number(data.totalAmount).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Balance due</Text>
                    <Text>
                      {data.currency} {Number(data.balanceDue).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {data.notes && (
                  <View style={styles.notesFooter}>
                    <Text>{data.notes}</Text>
                  </View>
                )}
              </>
            )}

            <PoweredByFooter />
            <Text style={styles.pageNumber}>
              Page {pageIndex + 1} / {pages.length}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}
