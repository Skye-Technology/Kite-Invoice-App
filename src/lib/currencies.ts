export const CURRENCIES = ["EUR", "USD", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];
