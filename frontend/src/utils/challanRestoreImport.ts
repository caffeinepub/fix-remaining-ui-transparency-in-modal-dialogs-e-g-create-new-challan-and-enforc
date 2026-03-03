import { parseDateOnly, dateToNano } from './dates';
import { parseCSV } from './csv';
import type { Challan } from '../backend';

interface ParseResult {
  totalRows: number;
  validChallans: Challan[];
  errors: Array<{ row: number; message: string }>;
}

/**
 * Parse and validate challan restore CSV for date restoration.
 * Supports both legacy format (Start Date/End Date) and new format (Rent Date/Return Date).
 */
export function parseAndValidateChallanRestoreCSV(csvText: string): ParseResult {
  const parsed = parseCSV(csvText);
  const allRows = [parsed.headers, ...parsed.rows];
  
  if (allRows.length === 0) {
    return {
      totalRows: 0,
      validChallans: [],
      errors: [{ row: 0, message: 'CSV file is empty' }],
    };
  }

  const headers = allRows[0].map((h) => h.trim().toLowerCase());
  const errors: Array<{ row: number; message: string }> = [];
  const validChallans: Challan[] = [];

  // Determine format by checking headers
  const hasLegacyFormat = headers.includes('start date') && headers.includes('end date');
  const hasNewFormat = headers.includes('rent date') && headers.includes('return date');

  if (!hasLegacyFormat && !hasNewFormat) {
    return {
      totalRows: 0,
      validChallans: [],
      errors: [
        {
          row: 1,
          message: 'Missing required date columns. Expected either "Start Date" and "End Date" OR "Rent Date" and "Return Date"',
        },
      ],
    };
  }

  const challanIdIndex = headers.indexOf('challan id');
  const rentDateIndex = hasNewFormat ? headers.indexOf('rent date') : headers.indexOf('start date');
  const returnDateIndex = hasNewFormat ? headers.indexOf('return date') : headers.indexOf('end date');

  if (challanIdIndex === -1) {
    return {
      totalRows: 0,
      validChallans: [],
      errors: [{ row: 1, message: 'Missing required column: Challan ID' }],
    };
  }

  // Parse data rows
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const rowNumber = i + 1;

    try {
      const challanId = row[challanIdIndex]?.trim();
      if (!challanId) {
        errors.push({ row: rowNumber, message: 'Missing Challan ID' });
        continue;
      }

      const rentDateStr = row[rentDateIndex]?.trim();
      if (!rentDateStr) {
        errors.push({ row: rowNumber, message: 'Missing rent/start date' });
        continue;
      }

      const returnDateStr = row[returnDateIndex]?.trim();
      if (!returnDateStr) {
        errors.push({ row: rowNumber, message: 'Missing return/end date' });
        continue;
      }

      const rentDate = parseDateOnly(rentDateStr);
      if (!rentDate) {
        errors.push({ row: rowNumber, message: `Invalid rent/start date format: ${rentDateStr}` });
        continue;
      }

      const returnDate = parseDateOnly(returnDateStr);
      if (!returnDate) {
        errors.push({ row: rowNumber, message: `Invalid return/end date format: ${returnDateStr}` });
        continue;
      }

      if (returnDate <= rentDate) {
        errors.push({ row: rowNumber, message: 'Return date must be after rent date' });
        continue;
      }

      const rentDateNano = dateToNano(rentDate);
      const numberOfDays = Math.ceil((returnDate.getTime() - rentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Create a minimal Challan object with only the fields needed for date restoration
      const challan: Challan = {
        id: challanId,
        clientName: '', // Not needed for restore
        venue: '',
        items: [],
        freight: 0,
        numberOfDays,
        rentDate: rentDateNano,
        site: '',
        creationDate: rentDateNano,
        returned: false,
      };

      validChallans.push(challan);
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return {
    totalRows: allRows.length - 1,
    validChallans,
    errors,
  };
}
