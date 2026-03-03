import type { ChallanItem, Challan } from '../backend';

export function calcItemTotal(item: ChallanItem): number {
  return item.quantity * item.rate * item.rentalDays;
}

export function calcChallanTotal(items: ChallanItem[], freight: number): number {
  const itemsTotal = items.reduce((sum, item) => sum + calcItemTotal(item), 0);
  return itemsTotal + freight;
}

/**
 * Calculate total for a full Challan object
 */
export function calculateChallanTotal(challan: Challan): number {
  return calcChallanTotal(challan.items, challan.freight);
}

/**
 * Alias for calcItemTotal for backward compatibility
 */
export function calculateItemTotal(item: ChallanItem): number {
  return calcItemTotal(item);
}
