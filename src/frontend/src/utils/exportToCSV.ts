export function downloadInventoryTemplate() {
  const headers = ['Name', 'Total Quantity', 'Daily Rate'];
  const csvContent = headers.join(',') + '\n';
  downloadCSV(csvContent, 'inventory_template.csv');
}

export function downloadChallanTemplate() {
  const headers = [
    'Challan ID',
    'Client Name',
    'Venue',
    'Item Name',
    'Quantity',
    'Rate',
    'Rental Days',
    'Freight',
    'Number of Days',
    'Start Date',
    'End Date',
    'Site',
  ];
  const csvContent = headers.join(',') + '\n';
  downloadCSV(csvContent, 'challan_template.csv');
}

export function downloadChallanNewFormatTemplate() {
  const headers = [
    'Challan ID',
    'Client Name',
    'Venue',
    'Items',
    'Freight',
    'Number of Days',
    'Rent Date',
    'Return Date',
    'Site',
  ];
  const csvContent = headers.join(',') + '\n';
  downloadCSV(csvContent, 'challan_new_format_template.csv');
}

export function downloadPaymentTemplate() {
  const headers = ['Payment ID', 'Date', 'Client', 'Mode', 'Amount', 'Reference Number', 'Site'];
  const csvContent = headers.join(',') + '\n';
  downloadCSV(csvContent, 'payment_template.csv');
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
    'Category Expenses',
    'Remarks',
  ];
  const csvContent = headers.join(',') + '\n';
  downloadCSV(csvContent, 'petty_cash_template.csv');
}

export function downloadClientTemplate() {
  const headers = ['Name'];
  const csvContent = headers.join(',') + '\n';
  downloadCSV(csvContent, 'client_template.csv');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
