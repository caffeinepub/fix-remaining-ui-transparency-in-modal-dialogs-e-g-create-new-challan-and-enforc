import { parseDateOnly } from './dates';
import type { Challan, ChallanItem } from '../backend';

interface ParsedRow {
  challanId: string;
  clientName: string;
  venue: string;
  itemName: string;
  quantity: number;
  rate: number;
  startDate: Date;
  endDate: Date;
  freight: number;
}

interface ParseResult {
  totalRows: number;
  validChallans: Challan[];
  errors: Array<{ row: number; message: string }>;
}

export function parseChallanCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split('\n');
  const errors: Array<{ row: number; message: string }> = [];
  const parsedRows: ParsedRow[] = [];

  if (lines.length === 0) {
    return {
      totalRows: 0,
      validChallans: [],
      errors: [{ row: 0, message: 'File is empty' }],
    };
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim());
  const expectedHeaders = [
    'Challan ID',
    'Client Name',
    'Venue',
    'Item Name',
    'Quantity',
    'Rate',
    'Start Date',
    'End Date',
    'Freight',
  ];

  const missingHeaders = expectedHeaders.filter((h) => !header.includes(h));
  if (missingHeaders.length > 0) {
    return {
      totalRows: 0,
      validChallans: [],
      errors: [{ row: 1, message: `Missing required columns: ${missingHeaders.join(', ')}` }],
    };
  }

  const challanIdIndex = header.indexOf('Challan ID');
  const clientNameIndex = header.indexOf('Client Name');
  const venueIndex = header.indexOf('Venue');
  const itemNameIndex = header.indexOf('Item Name');
  const quantityIndex = header.indexOf('Quantity');
  const rateIndex = header.indexOf('Rate');
  const startDateIndex = header.indexOf('Start Date');
  const endDateIndex = header.indexOf('End Date');
  const freightIndex = header.indexOf('Freight');

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map((v) => v.trim());
    const rowNumber = i + 1;

    try {
      const challanId = values[challanIdIndex];
      const clientName = values[clientNameIndex];
      const venue = values[venueIndex] || ''; // Allow blank venue
      const itemName = values[itemNameIndex];
      const quantityStr = values[quantityIndex];
      const rateStr = values[rateIndex];
      const startDateStr = values[startDateIndex];
      const endDateStr = values[endDateIndex];
      const freightStr = values[freightIndex];

      if (!challanId) {
        errors.push({ row: rowNumber, message: 'Missing Challan ID' });
        continue;
      }

      if (!clientName) {
        errors.push({ row: rowNumber, message: 'Missing Client Name' });
        continue;
      }

      if (!itemName) {
        errors.push({ row: rowNumber, message: 'Missing Item Name' });
        continue;
      }

      const quantity = parseFloat(quantityStr);
      if (isNaN(quantity) || quantity < 0) {
        errors.push({ row: rowNumber, message: 'Invalid Quantity (must be non-negative)' });
        continue;
      }

      const rate = parseFloat(rateStr);
      if (isNaN(rate) || rate < 0) {
        errors.push({ row: rowNumber, message: 'Invalid Rate (must be non-negative)' });
        continue;
      }

      const startDate = parseDateOnly(startDateStr);
      if (!startDate) {
        errors.push({ row: rowNumber, message: `Invalid Start Date format: ${startDateStr}` });
        continue;
      }

      const endDate = parseDateOnly(endDateStr);
      if (!endDate) {
        errors.push({ row: rowNumber, message: `Invalid End Date format: ${endDateStr}` });
        continue;
      }

      if (endDate <= startDate) {
        errors.push({ row: rowNumber, message: 'End Date must be after Start Date' });
        continue;
      }

      const freight = parseFloat(freightStr);
      if (isNaN(freight) || freight < 0) {
        errors.push({ row: rowNumber, message: 'Invalid Freight' });
        continue;
      }

      parsedRows.push({
        challanId,
        clientName,
        venue,
        itemName,
        quantity,
        rate,
        startDate,
        endDate,
        freight,
      });
    } catch (error) {
      errors.push({ row: rowNumber, message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  }

  // Group by challan ID
  const challanMap = new Map<string, ParsedRow[]>();
  for (const row of parsedRows) {
    if (!challanMap.has(row.challanId)) {
      challanMap.set(row.challanId, []);
    }
    challanMap.get(row.challanId)!.push(row);
  }

  // Check for duplicate items within each challan
  for (const [challanId, rows] of challanMap.entries()) {
    const itemNames = rows.map((r) => r.itemName);
    const uniqueNames = new Set(itemNames);
    if (itemNames.length !== uniqueNames.size) {
      const duplicates = itemNames.filter((name, index) => itemNames.indexOf(name) !== index);
      errors.push({
        row: 0,
        message: `Challan ${challanId} has duplicate items: ${duplicates.join(', ')}`,
      });
      challanMap.delete(challanId);
    }
  }

  // Convert to Challan objects
  const validChallans: Challan[] = Array.from(challanMap.entries()).map(([challanId, rows]) => {
    const firstRow = rows[0];
    const numberOfDays = Math.ceil((firstRow.endDate.getTime() - firstRow.startDate.getTime()) / (1000 * 60 * 60 * 24));

    const items: ChallanItem[] = rows.map((row) => ({
      itemName: row.itemName,
      quantity: row.quantity,
      rate: row.rate,
      rentalDays: numberOfDays,
    }));

    const rentDate = BigInt(firstRow.startDate.getTime() * 1_000_000);
    const creationDate = BigInt(Date.now() * 1_000_000);

    return {
      id: challanId,
      clientName: firstRow.clientName,
      venue: firstRow.venue,
      items,
      freight: firstRow.freight,
      numberOfDays,
      rentDate,
      site: '', // Default empty site
      creationDate,
      returned: false,
    };
  });

  return {
    totalRows: lines.length - 1,
    validChallans,
    errors,
  };
}

export function parseAndValidateChallanCSV(
  csvText: string,
  existingChallans: Challan[]
): {
  valid: Challan[];
  errors: Array<{ challanId: string; rowNumber: number; error: string }>;
} {
  const parseResult = parseChallanCSV(csvText);
  const existingIds = new Set(existingChallans.map((c) => c.id));

  const errors: Array<{ challanId: string; rowNumber: number; error: string }> = [];

  // Convert parse errors to validation errors
  for (const err of parseResult.errors) {
    errors.push({
      challanId: '',
      rowNumber: err.row,
      error: err.message,
    });
  }

  // Check for duplicate IDs
  const validChallans: Challan[] = [];
  for (const challan of parseResult.validChallans) {
    if (existingIds.has(challan.id)) {
      errors.push({
        challanId: challan.id,
        rowNumber: 0,
        error: `Challan ID ${challan.id} already exists`,
      });
    } else {
      validChallans.push(challan);
    }
  }

  return {
    valid: validChallans,
    errors,
  };
}
