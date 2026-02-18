import type { Challan, Payment, PettyCash } from '../backend';
import { buildChallanWorksheetData } from './challanExportTemplate';
import { formatDateFromNano, formatCurrency, safeText } from './reportExportFormatters';

interface ReportData {
  challans: Challan[];
  payments: Payment[];
  pettyCash: PettyCash[];
  clientBalances: Array<{
    clientName: string;
    totalRent: number;
    totalPayments: number;
    outstandingBalance: number;
    advance: number;
  }>;
  summary: {
    totalRent: number;
    totalReceived: number;
    cashReceived: number;
    pendingAmount: number;
    outstanding: number;
    advance: number;
    pettyCashAdjustments: number;
  };
}

export async function exportReportToExcel(data: ReportData): Promise<void> {
  // Dynamically load SheetJS from CDN
  const XLSX = await loadSheetJS();

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary Sheet - now includes Cash Received
  const summaryData = [
    ['Summary Report'],
    [''],
    ['Metric', 'Amount (₹)'],
    ['Total Rent', data.summary.totalRent.toFixed(2)],
    ['Total Received', data.summary.totalReceived.toFixed(2)],
    ['Cash Received', data.summary.cashReceived.toFixed(2)],
    ['Outstanding', data.summary.outstanding.toFixed(2)],
    ['Advance', data.summary.advance.toFixed(2)],
    ['Petty Cash Adjustments', data.summary.pettyCashAdjustments.toFixed(2)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Challans Sheet - using template format with item-level detail rows
  const challansData = buildChallanWorksheetData(data.challans);
  const challansSheet = XLSX.utils.aoa_to_sheet(challansData);
  XLSX.utils.book_append_sheet(wb, challansSheet, 'Challans');

  // Payments Sheet - detail rows
  const paymentsData = [
    ['Payment ID', 'Date', 'Client', 'Mode', 'Amount', 'Reference Number', 'Site'],
    ...data.payments.map((p) => [
      p.id,
      formatDateFromNano(p.date),
      p.client,
      p.mode,
      formatCurrency(p.amount),
      safeText(p.referenceNumber),
      safeText(p.site),
    ]),
  ];
  const paymentsSheet = XLSX.utils.aoa_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(wb, paymentsSheet, 'Payments');

  // Petty Cash Sheet - detail rows with Cash Received column
  const pettyCashData = [
    [
      'Date',
      'Opening Balance',
      'Cash Received',
      'Cash From MD',
      'Expenses',
      'Staff Advance',
      'Handover To MD',
      'Transfer From Cash Equivalents',
      'Net Change',
      'Closing Balance',
      'Remarks',
    ],
    ...data.pettyCash.map((pc) => {
      // Calculate cash received for this petty cash date
      const cashReceivedForDate = data.payments
        .filter(p => p.mode.toUpperCase() === 'CASH' && p.date === pc.date)
        .reduce((sum, p) => sum + p.amount, 0);

      return [
        formatDateFromNano(pc.date),
        formatCurrency(pc.openingBalance),
        formatCurrency(cashReceivedForDate),
        formatCurrency(pc.cashFromMd),
        formatCurrency(pc.expenses),
        formatCurrency(pc.staffAdvance),
        formatCurrency(pc.handoverToMd),
        formatCurrency(pc.transferFromCashEquivalents),
        formatCurrency(pc.netChange),
        formatCurrency(pc.closingBalance),
        safeText(pc.remarks),
      ];
    }),
  ];
  const pettyCashSheet = XLSX.utils.aoa_to_sheet(pettyCashData);
  XLSX.utils.book_append_sheet(wb, pettyCashSheet, 'Petty Cash');

  // Client Balances Sheet - detail rows
  const clientBalancesData = [
    ['Client Name', 'Total Rent', 'Total Payments', 'Outstanding', 'Advance'],
    ...data.clientBalances.map((cb) => [
      cb.clientName,
      formatCurrency(cb.totalRent),
      formatCurrency(cb.totalPayments),
      formatCurrency(cb.outstandingBalance),
      formatCurrency(cb.advance),
    ]),
  ];
  const clientBalancesSheet = XLSX.utils.aoa_to_sheet(clientBalancesData);
  XLSX.utils.book_append_sheet(wb, clientBalancesSheet, 'Clients');

  // Write file
  XLSX.writeFile(wb, 'Master report.xls');
}

async function loadSheetJS(): Promise<any> {
  // Check if already loaded
  if ((window as any).XLSX) {
    return (window as any).XLSX;
  }

  // Load from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
    script.onload = () => {
      resolve((window as any).XLSX);
    };
    script.onerror = () => {
      reject(new Error('Failed to load SheetJS library'));
    };
    document.head.appendChild(script);
  });
}
