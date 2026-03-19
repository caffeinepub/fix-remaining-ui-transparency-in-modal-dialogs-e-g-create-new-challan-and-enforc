import type { PettyCash } from "../backend";
import { nanoToDate } from "./dates";

function formatCurrency(value: number): string {
  return `Rs.${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(nanos: bigint): string {
  const date = nanoToDate(nanos);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateNetChange(record: PettyCash): number {
  return (
    record.openingBalance +
    record.cashFromMd +
    record.transferFromCashEquivalents +
    record.cashReceivedAuto -
    record.expenses -
    record.staffAdvance -
    record.handoverToMd
  );
}

async function loadPdfLib(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).PDFLib) {
      resolve((window as any).PDFLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
    script.onload = () => resolve((window as any).PDFLib);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function generateAndPrintPettyCashPdf(
  record: PettyCash,
  attachments: Array<{ id: string; blob: any }>,
): Promise<void> {
  const PDFLib = await loadPdfLib();
  const { PDFDocument, rgb, StandardFonts } = PDFLib;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margin = 50;
  let y = height - margin;

  // Title
  page.drawText("RENTIQ - Petty Cash Record", {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  // Date
  page.drawText(`Date: ${formatDate(record.date)}`, {
    x: margin,
    y,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 25;

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;

  const netChange = calculateNetChange(record);
  const closingBalance = netChange;

  const rows: [string, number, boolean][] = [
    ["Opening Balance", record.openingBalance, false],
    ["Cash from MD", record.cashFromMd, false],
    [
      "Transfer from Cash Equivalents",
      record.transferFromCashEquivalents,
      false,
    ],
    ["Cash Received (Auto)", record.cashReceivedAuto, false],
    ["Expenses", record.expenses, true],
    ["Staff Advance", record.staffAdvance, true],
    ["Handover to MD", record.handoverToMd, true],
  ];

  for (const [label, value, isDeduction] of rows) {
    const prefix = isDeduction ? "- " : "+ ";
    page.drawText(label, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(`${prefix}${formatCurrency(value)}`, {
      x: width - margin - 160,
      y,
      size: 10,
      font: fontRegular,
      color: isDeduction ? rgb(0.8, 0.1, 0.1) : rgb(0.1, 0.5, 0.1),
    });
    y -= 20;
  }

  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 20;

  // Net Change
  page.drawText("Net Change", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(formatCurrency(netChange), {
    x: width - margin - 160,
    y,
    size: 11,
    font: fontBold,
    color: netChange >= 0 ? rgb(0.1, 0.5, 0.1) : rgb(0.8, 0.1, 0.1),
  });
  y -= 20;

  // Closing Balance
  page.drawText("Closing Balance", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(formatCurrency(closingBalance), {
    x: width - margin - 160,
    y,
    size: 11,
    font: fontBold,
    color: closingBalance >= 0 ? rgb(0.1, 0.5, 0.1) : rgb(0.8, 0.1, 0.1),
  });
  y -= 30;

  // Remarks
  if (record.remarks) {
    page.drawText("Remarks:", {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 15;
    page.drawText(record.remarks, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: width - margin * 2,
    });
  }

  // Append attachments
  for (const attachment of attachments) {
    try {
      let bytes: Uint8Array;
      if (attachment.blob && typeof attachment.blob.getBytes === "function") {
        bytes = await attachment.blob.getBytes();
      } else if (attachment.blob instanceof Uint8Array) {
        bytes = attachment.blob;
      } else {
        continue;
      }

      // Try to embed as image
      try {
        let embeddedImage: Awaited<ReturnType<typeof pdfDoc.embedJpg>>;
        try {
          embeddedImage = await pdfDoc.embedJpg(bytes);
        } catch {
          embeddedImage = await pdfDoc.embedPng(bytes);
        }
        const imgPage = pdfDoc.addPage([595, 842]);
        const { width: pw, height: ph } = imgPage.getSize();
        const scale = Math.min(
          (pw - 100) / embeddedImage.width,
          (ph - 100) / embeddedImage.height,
        );
        imgPage.drawImage(embeddedImage, {
          x: 50,
          y: (ph - embeddedImage.height * scale) / 2,
          width: embeddedImage.width * scale,
          height: embeddedImage.height * scale,
        });
      } catch {
        // Try as PDF
        try {
          const attachPdf = await PDFDocument.load(bytes);
          const copiedPages = await pdfDoc.copyPages(
            attachPdf,
            attachPdf.getPageIndices(),
          );
          for (const p of copiedPages) {
            pdfDoc.addPage(p);
          }
        } catch {
          // Skip unreadable attachment
        }
      }
    } catch {
      // Skip failed attachment
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Download
  const a = document.createElement("a");
  a.href = url;
  a.download = `petty-cash-${formatDate(record.date).replace(/\s/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Try to open print dialog
  try {
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }, 500);
      };
    } else {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
