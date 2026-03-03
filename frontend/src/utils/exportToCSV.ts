// CSV export utility for downloading templates

export function downloadInventoryTemplate() {
  const headers = ['Item Name', 'Total Quantity', 'Daily Rate'];
  const exampleRow = ['Example Item', '10', '100'];
  const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Inventory_Template_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadChallanTemplate() {
  const headers = [
    'Challan ID',
    'Client Name',
    'Venue',
    'Rent Date',
    'Number of Days',
    'Item Name',
    'Quantity',
    'Rate',
    'Freight',
    'Site',
  ];
  const exampleRow = [
    'CH001',
    'Example Client',
    'Example Venue',
    '01-Jan-25',
    '3',
    'Example Item',
    '2',
    '500',
    '0',
    'Udaipur',
  ];
  const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Challan_Template_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download template for the New Format challan bulk upload.
 * Headers must exactly match what parseAndValidateChallanNewFormatCSV expects:
 * Challan ID, Client Name, Venue, Items, Rent Date, Return Date, Freight
 *
 * Items format: semicolon-separated tokens, each in one of:
 *   - "ItemName:Quantity:Rate"
 *   - "ItemName(QtyxRatexDays)" or "ItemName(QtyxRatexDaysd)"
 */
export function downloadChallanNewFormatTemplate() {
  const headers = [
    'Challan ID',
    'Client Name',
    'Venue',
    'Items',
    'Rent Date',
    'Return Date',
    'Freight',
  ];
  const exampleRow = [
    'CH001',
    'Example Client',
    'Example Venue',
    'Sound System:2:500;Lights:10:200',
    '01-Jan-25',
    '04-Jan-25',
    '0',
  ];
  const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Challan_Template_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPaymentTemplate() {
  const headers = [
    'Payment ID',
    'Date',
    'Client',
    'Mode',
    'Amount',
    'Reference Number',
    'Site',
  ];
  const exampleRow = [
    'PAY001',
    '01-Jan-25',
    'Example Client',
    'CASH',
    '5000',
    'REF001',
    'Udaipur',
  ];
  const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Payment_Template_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPettyCashTemplate() {
  const headers = [
    'Date',
    'Opening Balance',
    'Cash From MD',
    'Expenses',
    'Staff Advance',
    'Handover To MD',
    'Transfer From Cash Equivalents',
    'Remarks',
  ];
  const exampleRow = [
    '01-Jan-25',
    '1000',
    '500',
    '200',
    '0',
    '0',
    '0',
    'Example remarks',
  ];
  const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PettyCash_Template_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadClientTemplate() {
  const headers = ['Client Name'];
  const exampleRow = ['Example Client'];
  const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Client_Template_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
