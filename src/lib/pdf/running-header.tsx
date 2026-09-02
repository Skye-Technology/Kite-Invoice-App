import { View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";

/**
 * Small "Invoice #… / Company name" strip shown at the top of continuation pages —
 * simpler than react-pdf's `fixed`/`render(pageNumber)` trick since pages here are built
 * by hand (see paginate.ts), so the caller already knows which page this is.
 */
export function RunningHeader({
  docLabel,
  companyName,
}: {
  docLabel: string;
  companyName: string;
}) {
  return (
    <View style={styles.runningHeader}>
      <Text style={styles.runningInvoice}>{docLabel}</Text>
      <Text style={styles.runningCompany}>{companyName}</Text>
    </View>
  );
}
