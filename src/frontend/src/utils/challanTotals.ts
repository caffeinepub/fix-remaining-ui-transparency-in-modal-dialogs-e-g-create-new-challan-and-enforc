// Shared challan calculation utilities to ensure consistent totals across the application

import type { ChallanItem, Challan } from '../backend';

/**
 * Calculate item total: quantity × rate × rental days
 */
export function calculateItemTotal(item: ChallanItem): number {
  return item.quantity * item.rate * item.rentalDays;
}

/**
 * Calculate challan total: sum of all item totals + freight
 */
export function calculateChallanTotal(challan: Challan): number {
  const itemsTotal = challan.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  return itemsTotal + challan.freight;
}

/**
 * Calculate items total only (without freight)
 */
export function calculateItemsTotal(items: ChallanItem[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
}

/**
 * Calculate total from form data (for create/edit dialogs)
 */
export function calculateFormItemTotal(
  quantity: number,
  rate: number,
  rentalDays: number
): number {
  return quantity * rate * rentalDays;
}

/**
 * Calculate challan total from form data
 */
export function calculateFormChallanTotal(
  items: Array<{ quantity: string; rate: string }>,
  freight: number,
  rentalDays: number
): number {
  const itemsTotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return sum + calculateFormItemTotal(qty, rate, rentalDays);
  }, 0);
  return itemsTotal + freight;
}
