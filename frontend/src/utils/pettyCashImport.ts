import type { PettyCash } from '../backend';
import { parseCSV } from './csv';
import { parseDateOnly, dateToNano } from './dates';

export interface PettyCashPreviewRow {
  rowNumber: number;
  date: string;
  openingBalance: string;
  cashFromMd: string;
  transferFromCashEquivalents: string;
  expenses: string;
  staffAdvance: string;
  handoverToMd: string;
  remarks: string;
  cashReceivedAuto: string;
}

export interface PettyCashParseResult {
  valid: PettyCash[];
  errors: Array<{ rowNumber: number; error: string }>;
  preview: PettyCashPreviewRow[];
}

function parseNum(val: string): number {
  if (!val || val.trim() === '') return 0;
  const n = parseFloat(val.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

export function parseAndValidatePettyCashCSV(
  csvText: string,
  existingRecords: PettyCash[]
): PettyCashParseResult {
  const result = parseCSV(csvText);
  const rows = result.rows;
  const headers = result.headers.map((h) => h.toLowerCase().trim());

  const valid: PettyCash[] = [];
  const errors: Array<{ rowNumber: number; error: string }> = [];
  const preview: PettyCashPreviewRow[] = [];

  const existingDates = new Set(existingRecords.map((r) => r.date.toString()));

  const getCol = (row: string[], name: string): string => {
    const idx = headers.indexOf(name.toLowerCase());
    return idx >= 0 ? (row[idx] || '').trim() : '';
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // 1-indexed, +1 for header

    const dateStr = getCol(row, 'date');
    const openingBalanceStr = getCol(row, 'opening balance') || getCol(row, 'openingbalance');
    const cashFromMdStr = getCol(row, 'cash from md') || getCol(row, 'cashfrommd');
    const transferStr =
      getCol(row, 'transfer from cash equivalents') ||
      getCol(row, 'transferfromcashequivalents') ||
      getCol(row, 'transfer');
    const expensesStr = getCol(row, 'expenses');
    const staffAdvanceStr = getCol(row, 'staff advance') || getCol(row, 'staffadvance');
    const handoverStr =
      getCol(row, 'handover to md') ||
      getCol(row, 'handovertomd') ||
      getCol(row, 'handover');
    const remarksStr = getCol(row, 'remarks');
    const cashReceivedAutoStr =
      getCol(row, 'cash received auto') || getCol(row, 'cashreceivedauto') || '0';

    preview.push({
      rowNumber,
      date: dateStr,
      openingBalance: openingBalanceStr,
      cashFromMd: cashFromMdStr,
      transferFromCashEquivalents: transferStr,
      expenses: expensesStr,
      staffAdvance: staffAdvanceStr,
      handoverToMd: handoverStr,
      remarks: remarksStr,
      cashReceivedAuto: cashReceivedAutoStr,
    });

    if (!dateStr) {
      errors.push({ rowNumber, error: 'Date is required' });
      continue;
    }

    const parsedDate = parseDateOnly(dateStr);
    if (!parsedDate) {
      errors.push({ rowNumber, error: `Invalid date format: "${dateStr}"` });
      continue;
    }

    const dateBigint = dateToNano(parsedDate);
    if (existingDates.has(dateBigint.toString())) {
      errors.push({ rowNumber, error: `Petty cash record already exists for date: ${dateStr}` });
      continue;
    }

    const openingBalance = parseNum(openingBalanceStr);
    const cashFromMd = parseNum(cashFromMdStr);
    const transferFromCashEquivalents = parseNum(transferStr);
    const expenses = parseNum(expensesStr);
    const staffAdvance = parseNum(staffAdvanceStr);
    const handoverToMd = parseNum(handoverStr);
    const cashReceivedAuto = parseNum(cashReceivedAutoStr);

    const netChange =
      openingBalance +
      cashFromMd +
      transferFromCashEquivalents +
      cashReceivedAuto -
      expenses -
      staffAdvance -
      handoverToMd;

    const record: PettyCash = {
      date: dateBigint,
      openingBalance,
      cashFromMd,
      transferFromCashEquivalents,
      expenses,
      staffAdvance,
      handoverToMd,
      netChange,
      closingBalance: netChange,
      categoryExpenses: [], // Always empty - category expenses removed
      remarks: remarksStr,
      cashReceivedAuto,
      createdAt: dateToNano(new Date()),
    };

    valid.push(record);
    existingDates.add(dateBigint.toString());
  }

  return { valid, errors, preview };
}
