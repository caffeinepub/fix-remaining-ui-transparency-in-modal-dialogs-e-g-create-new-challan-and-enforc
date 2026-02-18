import type { Challan } from '../backend';
import { formatDateFromNano, formatCurrency, safeText } from './reportExportFormatters';

/**
 * Challan worksheet builder that matches the provided template exactly.
 * Generates item-level rows with challan-level fields repeated for each item.
 */

export interface ChallanExportRow {
  challanId: string;
  clientName: string;
  venue: string;
  rentDate: string;
  site: string;
  itemName: string;
  quantity: string;
  rate: string;
  rentalDays: string;
  itemTotal: string;
  freight: string;
  challanTotal: string;
  status: string;
}

/**
 * Build Challan worksheet data with item-level detail rows
 */
export function buildChallanWorksheetData(challans: Challan[]): any[][] {
  // Header row matching the template
  const headers = [
    'Challan ID',
    'Client Name',
    'Venue',
    'Rent Date',
    'Site',
    'Item Name',
    'Quantity',
    'Rate',
    'Rental Days',
    'Item Total',
    'Freight',
    'Challan Total',
    'Status',
  ];

  const rows: any[][] = [headers];

  // Generate item-level rows
  challans.forEach((challan) => {
    // Calculate challan total
    const itemsTotal = challan.items.reduce(
      (sum, item) => sum + item.quantity * item.rate * item.rentalDays,
      0
    );
    const challanTotal = itemsTotal + challan.freight;

    // If challan has no items, create one row with empty item fields
    if (challan.items.length === 0) {
      rows.push([
        challan.id,
        challan.clientName,
        safeText(challan.venue),
        formatDateFromNano(challan.rentDate),
        safeText(challan.site),
        '', // itemName
        '', // quantity
        '', // rate
        '', // rentalDays
        '', // itemTotal
        formatCurrency(challan.freight),
        formatCurrency(challanTotal),
        challan.returned ? 'Returned' : 'Active',
      ]);
    } else {
      // Create one row per item
      challan.items.forEach((item, index) => {
        const itemTotal = item.quantity * item.rate * item.rentalDays;
        
        rows.push([
          challan.id,
          challan.clientName,
          safeText(challan.venue),
          formatDateFromNano(challan.rentDate),
          safeText(challan.site),
          item.itemName,
          formatCurrency(item.quantity),
          formatCurrency(item.rate),
          formatCurrency(item.rentalDays),
          formatCurrency(itemTotal),
          // Show freight only on first item row
          index === 0 ? formatCurrency(challan.freight) : '',
          // Show challan total only on first item row
          index === 0 ? formatCurrency(challanTotal) : '',
          challan.returned ? 'Returned' : 'Active',
        ]);
      });
    }
  });

  return rows;
}
