import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { styles } from "./styles";

export type ExpensePdfData = {
  expenseNumber: string;
  expenseDate: string;
  dueDate: string | null;
  currency: string;
  status: string;
  description: string;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  totalAmount: string;
  balanceDue: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  company: {
    name: string;
    address: string | null;
    email: string | null;
    taxNumber: string | null;
    logoDataUri: string | null;
  };
  vendor: {
    name: string;
    address: string | null;
    email: string | null;
  } | null;
  category: string | null;
  lines: {
    description: string;
    quantity: string;
    unitRate: string;
    taxRate: string;
    lineAmount: string;
  }[];
};

export function ExpensePdf({ data }: { data: ExpensePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {data.company.logoDataUri && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
              <Image src={data.company.logoDataUri} style={styles.logo} />
            )}
            <Text style={styles.title}>{data.company.name}</Text>
            {data.company.address && <Text style={styles.muted}>{data.company.address}</Text>}
            {data.company.email && <Text style={styles.muted}>{data.company.email}</Text>}
            {data.company.taxNumber && (
              <Text style={styles.muted}>Tax no. {data.company.taxNumber}</Text>
            )}
          </View>
          <View>
            <Text style={styles.title}>Expense {data.expenseNumber}</Text>
            <Text style={styles.muted}>Status: {data.status}</Text>
          </View>
        </View>

        <View style={[styles.section, { flexDirection: "row", justifyContent: "space-between" }]}>
          <View>
            <Text style={styles.label}>Vendor</Text>
            <Text style={styles.value}>{data.vendor?.name ?? "—"}</Text>
            {data.vendor?.address && <Text style={styles.muted}>{data.vendor.address}</Text>}
            {data.vendor?.email && <Text style={styles.muted}>{data.vendor.email}</Text>}
            {data.category && (
              <>
                <Text style={styles.label}>Category</Text>
                <Text style={styles.value}>{data.category}</Text>
              </>
            )}
          </View>
          <View>
            <Text style={styles.label}>Expense date</Text>
            <Text style={styles.value}>{data.expenseDate}</Text>
            {data.dueDate && (
              <>
                <Text style={styles.label}>Due date</Text>
                <Text style={styles.value}>{data.dueDate}</Text>
              </>
            )}
            {data.paymentMethod && (
              <>
                <Text style={styles.label}>Payment method</Text>
                <Text style={styles.value}>{data.paymentMethod}</Text>
              </>
            )}
            {data.referenceNumber && (
              <>
                <Text style={styles.label}>Reference</Text>
                <Text style={styles.value}>{data.referenceNumber}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{data.description}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} wrap={false}>
            <Text style={[styles.colDescription, styles.label]}>Description</Text>
            <Text style={[styles.colQty, styles.label]}>Qty</Text>
            <Text style={[styles.colRate, styles.label]}>Rate</Text>
            <Text style={[styles.colTax, styles.label]}>Tax</Text>
            <Text style={[styles.colAmount, styles.label]}>Amount</Text>
          </View>
          {data.lines.map((line, i) => (
            <View style={styles.row} wrap={false} key={i}>
              <Text style={styles.colDescription}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colRate}>{Number(line.unitRate).toFixed(2)}</Text>
              <Text style={styles.colTax}>{(Number(line.taxRate) * 100).toFixed(0)}%</Text>
              <Text style={styles.colAmount}>{Number(line.lineAmount).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>
              {data.currency} {Number(data.subtotal).toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text>
              {data.currency} {Number(data.taxTotal).toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.grandTotal]}>Total</Text>
            <Text style={styles.grandTotal}>
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
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
