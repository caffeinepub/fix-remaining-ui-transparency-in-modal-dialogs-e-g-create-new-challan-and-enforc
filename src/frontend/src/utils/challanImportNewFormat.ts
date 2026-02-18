import { parseDateOnly, dateToNano, calculateRentalDays } from './dates';
import { parseCSV } from './csv';
import type { Challan, ChallanItem } from '../backend';

interface ParsedRow {
  challanId: string;
  clientName: string;
  venue: string;
  items: Array<{ name: string; quantity: number; rate: number }>;
  rentDate: Date;
  returnDate: Date;
  freight: number;
}

interface ParseResult {
  totalRows: number;
  validChallans: Challan[];
  errors: Array<{ row: number; message: string }>;
}

/**
 * Parse item token in format: ItemName(qtyxratexdays) or ItemName(qtyxratexdaysd)
 * Extracts quantity and rate from the LAST parentheses group only.
 * Everything before the last parentheses group is treated as the item name.
 * Returns { name, quantity, rate } or null if invalid
 */
function parseParenthesesFormat(token: string): { name: string; quantity: number; rate: number } | null {
  // Match the LAST parentheses group: (qtyxratexdays) or (qtyxratexdaysd)
  // Use greedy capture for name (everything before last parentheses)
  const match = token.match(/^(.+)\(([0-9.]+)x([0-9.]+)x([0-9.]+)d?\)$/);
  if (!match) return null;

  const [, name, qtyStr, rateStr] = match;
  const quantity = parseFloat(qtyStr);
  const rate = parseFloat(rateStr);

  if (!name.trim() || isNaN(quantity) || quantity < 0 || isNaN(rate) || rate < 0) {
    return null;
  }

  return { name: name.trim(), quantity, rate };
}

/**
 * Parse item token in format: ItemName:Quantity:Rate
 * Returns { name, quantity, rate } or null if invalid
 */
function parseColonFormat(token: string): { name: string; quantity: number; rate: number } | null {
  const parts = token.split(':').map((p) => p.trim());
  if (parts.length !== 3) return null;

  const [name, quantityStr, rateStr] = parts;
  const quantity = parseFloat(quantityStr);
  const rate = parseFloat(rateStr);

  if (!name || isNaN(quantity) || quantity < 0 || isNaN(rate) || rate < 0) {
    return null;
  }

  return { name, quantity, rate };
}

/**
 * Parse an item token supporting both formats
 */
function parseItemToken(token: string): { name: string; quantity: number; rate: number } | null {
  // Try parentheses format first
  const parenthesesResult = parseParenthesesFormat(token);
  if (parenthesesResult) return parenthesesResult;

  // Try colon format
  const colonResult = parseColonFormat(token);
  if (colonResult) return colonResult;

  return null;
}

export function parseChallanNewFormatCSV(csvText: string): ParseResult {
  const errors: Array<{ row: number; message: string }> = [];
  const parsedRows: ParsedRow[] = [];

  try {
    const { headers, rows } = parseCSV(csvText);

    if (headers.length === 0) {
      return {
        totalRows: 0,
        validChallans: [],
        errors: [{ row: 0, message: 'File is empty' }],
      };
    }

    // Validate headers
    const expectedHeaders = [
      'Challan ID',
      'Client Name',
      'Venue',
      'Items',
      'Rent Date',
      'Return Date',
      'Freight',
    ];

    const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return {
        totalRows: 0,
        validChallans: [],
        errors: [{ row: 1, message: `Missing required columns: ${missingHeaders.join(', ')}` }],
      };
    }

    const challanIdIndex = headers.indexOf('Challan ID');
    const clientNameIndex = headers.indexOf('Client Name');
    const venueIndex = headers.indexOf('Venue');
    const itemsIndex = headers.indexOf('Items');
    const rentDateIndex = headers.indexOf('Rent Date');
    const returnDateIndex = headers.indexOf('Return Date');
    const freightIndex = headers.indexOf('Freight');

    // Parse data rows
    for (let i = 0; i < rows.length; i++) {
      const values = rows[i];
      const rowNumber = i + 2; // +2 because header is row 1, data starts at row 2

      try {
        const challanId = values[challanIdIndex] || '';
        const clientName = values[clientNameIndex] || '';
        const venue = values[venueIndex] || ''; // Allow blank venue
        const itemsStr = values[itemsIndex] || '';
        const rentDateStr = values[rentDateIndex] || '';
        const returnDateStr = values[returnDateIndex] || '';
        const freightStr = values[freightIndex] || '';

        if (!challanId) {
          errors.push({ row: rowNumber, message: 'Missing Challan ID' });
          continue;
        }

        if (!clientName) {
          errors.push({ row: rowNumber, message: 'Missing Client Name' });
          continue;
        }

        if (!itemsStr) {
          errors.push({ row: rowNumber, message: 'Missing Items' });
          continue;
        }

        // Parse items (semicolon-separated tokens)
        const itemTokens = itemsStr.split(';').map((t) => t.trim()).filter((t) => t);
        if (itemTokens.length === 0) {
          errors.push({ row: rowNumber, message: 'No items found' });
          continue;
        }

        const items: Array<{ name: string; quantity: number; rate: number }> = [];
        let itemParseError = false;

        for (const token of itemTokens) {
          const parsed = parseItemToken(token);
          if (!parsed) {
            errors.push({
              row: rowNumber,
              message: `Invalid item format: "${token}". Expected formats: "ItemName:Quantity:Rate" or "ItemName(qtyxratexdays)" or "ItemName(qtyxratexdaysd)"`,
            });
            itemParseError = true;
            break;
          }
          items.push(parsed);
        }

        if (itemParseError) continue;

        // Parse dates
        const rentDate = parseDateOnly(rentDateStr);
        if (!rentDate) {
          errors.push({ row: rowNumber, message: `Invalid Rent Date: "${rentDateStr}"` });
          continue;
        }

        const returnDate = parseDateOnly(returnDateStr);
        if (!returnDate) {
          errors.push({ row: rowNumber, message: `Invalid Return Date: "${returnDateStr}"` });
          continue;
        }

        // Validate Return Date is strictly after Rent Date
        if (returnDate <= rentDate) {
          errors.push({ row: rowNumber, message: 'Return date must be after rent date' });
          continue;
        }

        // Parse freight
        const freight = parseFloat(freightStr);
        if (isNaN(freight) || freight < 0) {
          errors.push({ row: rowNumber, message: `Invalid Freight: "${freightStr}"` });
          continue;
        }

        parsedRows.push({
          challanId,
          clientName,
          venue,
          items,
          rentDate,
          returnDate,
          freight,
        });
      } catch (error) {
        errors.push({ row: rowNumber, message: `Unexpected error: ${error}` });
      }
    }
  } catch (error) {
    return {
      totalRows: 0,
      validChallans: [],
      errors: [{ row: 0, message: `Failed to parse CSV: ${error}` }],
    };
  }

  // Convert parsed rows to Challan objects
  const validChallans: Challan[] = parsedRows.map((row) => {
    // Calculate rental days using shared utility for consistency
    const numberOfDays = calculateRentalDays(row.rentDate, row.returnDate);

    const challanItems: ChallanItem[] = row.items.map((item) => ({
      itemName: item.name,
      quantity: item.quantity,
      rate: item.rate,
      rentalDays: numberOfDays,
    }));

    // Convert dates to nanoseconds using shared utility (matches legacy import and restore behavior)
    const rentDateNano = dateToNano(row.rentDate);
    const creationDateNano = dateToNano(new Date());

    return {
      id: row.challanId,
      clientName: row.clientName,
      venue: row.venue,
      items: challanItems,
      freight: row.freight,
      numberOfDays,
      returned: false,
      rentDate: rentDateNano,
      site: '',
      creationDate: creationDateNano,
    };
  });

  return {
    totalRows: parsedRows.length + errors.length,
    validChallans,
    errors,
  };
}

export function parseAndValidateChallanNewFormatCSV(csvText: string): ParseResult {
  return parseChallanNewFormatCSV(csvText);
}
