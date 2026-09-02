import Decimal from "decimal.js";

export type LineInput = {
  quantity: number | string;
  unitRate: number | string;
  taxRate: number | string;
};

export function computeLineAmount(line: LineInput) {
  return new Decimal(line.quantity).times(line.unitRate);
}

export function computeTotals(lines: LineInput[]) {
  let subtotal = new Decimal(0);
  let taxTotal = new Decimal(0);

  for (const line of lines) {
    const lineAmount = computeLineAmount(line);
    subtotal = subtotal.plus(lineAmount);
    taxTotal = taxTotal.plus(lineAmount.times(line.taxRate));
  }

  return {
    subtotal,
    taxTotal,
    totalAmount: subtotal.plus(taxTotal),
  };
}

export function toDecimalString(value: Decimal | number | string) {
  return new Decimal(value).toFixed(2);
}
