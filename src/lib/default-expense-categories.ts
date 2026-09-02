// Starter cost categories every company gets on creation — ported from Gekko's own default
// category list so historical expense data categorized there maps onto something familiar
// here. None of Gekko's defaults were balance-sheet items in practice, so isBalanceSheet is
// false across the board; vatDeductible mirrors Gekko's own defaults (everything except
// catered food and personal costs, which aren't VAT-reclaimable).
export const DEFAULT_EXPENSE_CATEGORIES: {
  name: string;
  icon: string;
  vatDeductible: boolean;
}[] = [
  { name: "Materials", icon: "🧱", vatDeductible: true },
  { name: "Car costs", icon: "🚗", vatDeductible: true },
  { name: "Travel costs (non car)", icon: "✈️", vatDeductible: true },
  { name: "Representational gifts", icon: "🎁", vatDeductible: true },
  { name: "Food and beverages (non-catered)", icon: "🍅", vatDeductible: true },
  { name: "Food and beverages (catered)", icon: "🍱", vatDeductible: false },
  { name: "Office and administrative costs", icon: "💼", vatDeductible: true },
  { name: "Personal costs", icon: "🏠", vatDeductible: false },
  { name: "Other costs", icon: "❓", vatDeductible: true },
];
