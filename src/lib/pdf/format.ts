import Decimal from "decimal.js";

/** Splits a free-text address field into non-empty lines for the letterhead layout. */
export function splitAddressLines(address: string | null): string[] {
  if (!address) return [];
  return address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Builds address lines for a Contact from its structured fields (address/city/postalCode/country). */
export function contactAddressLines(contact: {
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}): string[] {
  const lines: string[] = [];
  if (contact.address) lines.push(contact.address);
  const cityLine = [contact.postalCode, contact.city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (contact.country) lines.push(contact.country);
  return lines;
}

export function formatQuantity(quantity: string): string {
  return `${Number(quantity).toFixed(1)} x`;
}

/** "6 Jun 2025" style, matching the Gekko reference. */
export function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Groups line items by tax rate and sums the VAT amount per group, so an invoice mixing
 * e.g. 21% and 0%-exempt lines gets one totals row per distinct rate rather than a single
 * blended (and potentially misleading) VAT line.
 */
export function groupVatByRate(
  lines: { taxRate: string; lineAmount: string }[]
): { rate: string; amount: Decimal }[] {
  const groups = new Map<string, Decimal>();
  for (const line of lines) {
    const vat = new Decimal(line.lineAmount).times(line.taxRate);
    groups.set(line.taxRate, (groups.get(line.taxRate) ?? new Decimal(0)).plus(vat));
  }
  return Array.from(groups.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([rate, amount]) => ({ rate, amount }));
}
