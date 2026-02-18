import { parseCSV } from './csv';
import { parseDateOnly, dateToNano } from './dates';
import type { PettyCash, PettyCashCategory } from '../backend';

export interface ParsedPettyCashRow {
  date: string;
  openingBalance: string;
  cashFromMd: string;
  expenses: string;
  staffAdvance: string;
  handoverToMd: string;
  transferFromCashEquivalents: string;
  categoryExpenses: string;
  remarks: string;
}

interface ValidationResult {
  valid: PettyCash[];
  errors: Array<{ rowNumber: number; error: string; id?: string }>;
}

export function parseAndValidatePettyCashCSV(
  csvText: string,
  existingRecords: PettyCash[]
): ValidationResult {
  const parsed = parseCSV(csvText);
  const allRows = [parsed.headers, ...parsed.rows];
  
  if (allRows.length === 0) {
    return { valid: [], errors: [{ rowNumber: 0, error: 'CSV file is empty' }] };
  }

  const headers = allRows[0].map((h) => h.trim().toLowerCase());
  const requiredHeaders = [
    'date',
    'opening balance',
    'cash from md',
    'expenses',
    'staff advance',
    'handover to md',
    'transfer from cash equivalents',
    'category expenses',
    'remarks',
  ];

  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      valid: [],
      errors: [
        {
          rowNumber: 0,
          error: `Missing required columns: ${missingHeaders.join(', ')}`,
        },
      ],
    };
  }

  const dateIndex = headers.indexOf('date');
  const openingBalanceIndex = headers.indexOf('opening balance');
  const cashFromMdIndex = headers.indexOf('cash from md');
  const expensesIndex = headers.indexOf('expenses');
  const staffAdvanceIndex = headers.indexOf('staff advance');
  const handoverToMdIndex = headers.indexOf('handover to md');
  const transferIndex = headers.indexOf('transfer from cash equivalents');
  const categoryExpensesIndex = headers.indexOf('category expenses');
  const remarksIndex = headers.indexOf('remarks');

  const valid: PettyCash[] = [];
  const errors: Array<{ rowNumber: number; error: string; id?: string }> = [];

  const existingDates = new Set(existingRecords.map((r) => r.date.toString()));

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const rowNumber = i + 1;

    try {
      const dateStr = row[dateIndex]?.trim();
      if (!dateStr) {
        errors.push({ rowNumber, error: 'Date is required' });
        continue;
      }

      const parsedDate = parseDateOnly(dateStr);
      if (!parsedDate) {
        errors.push({ rowNumber, error: `Invalid date format: ${dateStr}` });
        continue;
      }

      const dateNano = dateToNano(parsedDate);

      if (existingDates.has(dateNano.toString())) {
        errors.push({
          rowNumber,
          error: `Petty cash record already exists for date: ${dateStr}`,
          id: dateStr,
        });
        continue;
      }

      const openingBalance = parseFloat(row[openingBalanceIndex]?.trim() || '0');
      const cashFromMd = parseFloat(row[cashFromMdIndex]?.trim() || '0');
      const expenses = parseFloat(row[expensesIndex]?.trim() || '0');
      const staffAdvance = parseFloat(row[staffAdvanceIndex]?.trim() || '0');
      const handoverToMd = parseFloat(row[handoverToMdIndex]?.trim() || '0');
      const transferFromCashEquivalents = parseFloat(row[transferIndex]?.trim() || '0');

      if (isNaN(openingBalance) || isNaN(cashFromMd) || isNaN(expenses) || isNaN(staffAdvance) || isNaN(handoverToMd) || isNaN(transferFromCashEquivalents)) {
        errors.push({ rowNumber, error: 'Invalid numeric value in one or more fields' });
        continue;
      }

      const categoryExpensesStr = row[categoryExpensesIndex]?.trim() || '';
      const categoryExpenses = parseCategoryExpenses(categoryExpensesStr);

      const remarks = row[remarksIndex]?.trim() || '';

      const netChange = cashFromMd - expenses - staffAdvance - handoverToMd;
      const closingBalance = openingBalance + netChange;

      const record: PettyCash = {
        date: dateNano,
        openingBalance,
        cashFromMd,
        expenses,
        staffAdvance,
        handoverToMd,
        netChange,
        closingBalance,
        transferFromCashEquivalents,
        categoryExpenses,
        remarks,
        createdAt: dateToNano(new Date()),
      };

      valid.push(record);
    } catch (error: any) {
      errors.push({ rowNumber, error: error.message || 'Unknown error' });
    }
  }

  return { valid, errors };
}

function parseCategoryExpenses(str: string): PettyCashCategory[] {
  if (!str) return [];

  const categories: PettyCashCategory[] = [];
  const pairs = str.split(';').map((s) => s.trim()).filter(Boolean);

  for (const pair of pairs) {
    const [title, amountStr] = pair.split(':').map((s) => s.trim());
    if (title && amountStr) {
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        categories.push({ title, amount });
      }
    }
  }

  return categories;
}
