import type { Payment } from '../backend';
import { parseDate } from './dates';

interface ParsedPaymentRow {
  rowNumber: number;
  id: string;
  date: string;
  client: string;
  mode: string;
  amount: string;
  referenceNumber: string;
  site: string;
}

interface ValidationResult {
  valid: Payment[];
  errors: Array<{ rowNumber: number; error: string; id?: string }>;
}

/**
 * Parse CSV text into payment rows
 */
function parseCSV(text: string): ParsedPaymentRow[] {
  const lines = text.split('\n').filter((line) => line.trim());
  const rows: ParsedPaymentRow[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted values)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= 6) {
      rows.push({
        rowNumber: i + 1,
        id: values[0].replace(/^"|"$/g, ''),
        date: values[1].replace(/^"|"$/g, ''),
        client: values[2].replace(/^"|"$/g, ''),
        mode: values[3].replace(/^"|"$/g, ''),
        amount: values[4].replace(/^"|"$/g, ''),
        referenceNumber: values[5].replace(/^"|"$/g, ''),
        site: values[6]?.replace(/^"|"$/g, '') || '',
      });
    }
  }

  return rows;
}

/**
 * Validate and convert parsed rows to Payment objects
 */
export function parseAndValidatePaymentCSV(
  text: string,
  existingPayments: Payment[]
): ValidationResult {
  const rows = parseCSV(text);
  const valid: Payment[] = [];
  const errors: Array<{ rowNumber: number; error: string; id?: string }> = [];

  const existingIds = new Set(existingPayments.map((p) => p.id));
  const seenIds = new Set<string>();

  for (const row of rows) {
    // Validate ID
    if (!row.id || row.id.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, error: 'Payment ID is required' });
      continue;
    }

    // Check for duplicate ID in existing payments
    if (existingIds.has(row.id)) {
      errors.push({
        rowNumber: row.rowNumber,
        error: `Payment with ID "${row.id}" already exists`,
        id: row.id,
      });
      continue;
    }

    // Check for duplicate ID within the file
    if (seenIds.has(row.id)) {
      errors.push({
        rowNumber: row.rowNumber,
        error: `Duplicate payment ID "${row.id}" found in upload file`,
        id: row.id,
      });
      continue;
    }

    // Validate date
    let dateNano: bigint;
    try {
      const parsedDate = parseDate(row.date);
      if (!parsedDate) {
        throw new Error('Invalid date format');
      }
      dateNano = BigInt(parsedDate.getTime() * 1_000_000);
    } catch (error) {
      errors.push({
        rowNumber: row.rowNumber,
        error: `Invalid date format "${row.date}". Use YYYY-MM-DD`,
        id: row.id,
      });
      continue;
    }

    // Validate client
    if (!row.client || row.client.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        error: 'Client name is required',
        id: row.id,
      });
      continue;
    }

    // Validate mode
    if (!row.mode || row.mode.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        error: 'Payment mode is required',
        id: row.id,
      });
      continue;
    }

    // Validate amount
    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push({
        rowNumber: row.rowNumber,
        error: `Invalid amount "${row.amount}". Must be a positive number`,
        id: row.id,
      });
      continue;
    }

    // Reference number is optional, default to empty string
    const referenceNumber = row.referenceNumber || '';

    seenIds.add(row.id);
    const createdAt = BigInt(Date.now() * 1_000_000);

    valid.push({
      id: row.id,
      date: dateNano,
      client: row.client,
      mode: row.mode,
      amount,
      referenceNumber,
      createdAt,
      site: row.site || '',
    });
  }

  return { valid, errors };
}
