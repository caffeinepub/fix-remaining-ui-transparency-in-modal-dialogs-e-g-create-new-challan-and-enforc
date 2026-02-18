import type { Client } from '../backend';

interface ParsedClientRow {
  rowNumber: number;
  name: string;
}

interface ValidationResult {
  valid: Client[];
  errors: Array<{ rowNumber: number; error: string; id?: string }>;
}

/**
 * Parse CSV text into client rows
 */
function parseCSV(text: string): ParsedClientRow[] {
  const lines = text.split('\n').filter((line) => line.trim());
  const rows: ParsedClientRow[] = [];

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

    if (values.length >= 1) {
      rows.push({
        rowNumber: i + 1,
        name: values[0].replace(/^"|"$/g, ''),
      });
    }
  }

  return rows;
}

/**
 * Validate and convert parsed rows to Client objects
 */
export function parseAndValidateClientCSV(
  text: string,
  existingClients: Client[]
): ValidationResult {
  const rows = parseCSV(text);
  const valid: Client[] = [];
  const errors: Array<{ rowNumber: number; error: string; id?: string }> = [];

  const existingNames = new Set(existingClients.map((c) => c.name));
  const seenNames = new Set<string>();

  for (const row of rows) {
    // Validate name
    if (!row.name || row.name.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, error: 'Client name is required' });
      continue;
    }

    // Check for duplicate name in existing clients
    if (existingNames.has(row.name)) {
      errors.push({
        rowNumber: row.rowNumber,
        error: `Client "${row.name}" already exists`,
        id: row.name,
      });
      continue;
    }

    // Check for duplicate name within the file
    if (seenNames.has(row.name)) {
      errors.push({
        rowNumber: row.rowNumber,
        error: `Duplicate client name "${row.name}" found in upload file`,
        id: row.name,
      });
      continue;
    }

    seenNames.add(row.name);
    const createdAt = BigInt(Date.now() * 1_000_000);

    valid.push({
      name: row.name,
      createdAt,
    });
  }

  return { valid, errors };
}
