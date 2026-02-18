interface PettyCashRecordData {
  date: string;
  openingBalance: number;
  cashReceivedAuto: number;
  cashFromMd: number;
  expenses: number;
  staffAdvance: number;
  handoverToMd: number;
  netChange: number;
  closingBalance: number;
  remarks: string;
}

// Type definitions for pdf-lib loaded from CDN
interface PDFLibModule {
  PDFDocument: any;
  rgb: (r: number, g: number, b: number) => any;
  StandardFonts: any;
}

interface PDFGenerationResult {
  success: boolean;
  printWarning?: string;
}

async function loadPDFLib(): Promise<PDFLibModule> {
  // Check if already loaded
  if ((window as any).PDFLib) {
    return (window as any).PDFLib;
  }

  // Load from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    script.onload = () => {
      resolve((window as any).PDFLib);
    };
    script.onerror = () => {
      reject(new Error('Failed to load PDF library'));
    };
    document.head.appendChild(script);
  });
}

export async function generatePettyCashPDF(
  recordData: PettyCashRecordData,
  dateNano: bigint
): Promise<PDFGenerationResult> {
  try {
    // Load pdf-lib from CDN
    const PDFLib = await loadPDFLib();
    const { PDFDocument, rgb, StandardFonts } = PDFLib;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add first page with petty cash details
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Title
    page.drawText('Petty Cash Record', {
      x: 50,
      y: height - 50,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Date
    page.drawText(`Date: ${recordData.date}`, {
      x: 50,
      y: height - 80,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Draw table
    let yPosition = height - 120;
    const lineHeight = 25;
    const labelX = 70;
    const valueX = 400;

    const rows = [
      { label: 'Opening Balance', value: `₹${recordData.openingBalance.toFixed(2)}` },
      { label: 'Cash Received (Auto)', value: `₹${recordData.cashReceivedAuto.toFixed(2)}` },
      { label: 'Cash from MD', value: `₹${recordData.cashFromMd.toFixed(2)}` },
      { label: 'Expenses', value: `₹${recordData.expenses.toFixed(2)}` },
      { label: 'Staff Advance', value: `₹${recordData.staffAdvance.toFixed(2)}` },
      { label: 'Handover to MD', value: `₹${recordData.handoverToMd.toFixed(2)}` },
      { label: 'Net Change', value: `₹${recordData.netChange.toFixed(2)}`, bold: true },
      { label: 'Closing Balance', value: `₹${recordData.closingBalance.toFixed(2)}`, bold: true },
    ];

    // Draw table header
    page.drawRectangle({
      x: 50,
      y: yPosition - 5,
      width: width - 100,
      height: lineHeight,
      color: rgb(0.9, 0.9, 0.9),
    });

    page.drawText('Description', {
      x: labelX,
      y: yPosition + 5,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Amount', {
      x: valueX,
      y: yPosition + 5,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= lineHeight;

    // Draw table rows
    for (const row of rows) {
      page.drawLine({
        start: { x: 50, y: yPosition + lineHeight },
        end: { x: width - 50, y: yPosition + lineHeight },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      const rowFont = row.bold ? boldFont : font;

      page.drawText(row.label, {
        x: labelX,
        y: yPosition + 5,
        size: 11,
        font: rowFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(row.value, {
        x: valueX,
        y: yPosition + 5,
        size: 11,
        font: rowFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;
    }

    // Draw bottom border
    page.drawLine({
      start: { x: 50, y: yPosition + lineHeight },
      end: { x: width - 50, y: yPosition + lineHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Remarks section
    if (recordData.remarks) {
      yPosition -= 30;
      page.drawText('Remarks:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;
      const remarksLines = wrapText(recordData.remarks, 80);
      for (const line of remarksLines) {
        page.drawText(line, {
          x: 70,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      }
    }

    // Fetch and append attachments
    try {
      // We need to get the actor to fetch attachments
      // This is a workaround since we can't use hooks in utility functions
      const actorModule = await import('../hooks/useActor');
      const actor = (actorModule as any).getActorInstance?.();

      if (actor) {
        const attachments = await actor.getAttachmentsForPettyCashRecord(dateNano);

        for (const attachment of attachments) {
          try {
            const bytes = await attachment.blob.getBytes();
            const mimeType = detectMimeType(bytes);

            if (mimeType === 'application/pdf') {
              // Merge PDF pages
              const attachedPdf = await PDFDocument.load(bytes);
              const copiedPages = await pdfDoc.copyPages(attachedPdf, attachedPdf.getPageIndices());
              copiedPages.forEach((copiedPage: any) => {
                pdfDoc.addPage(copiedPage);
              });
            } else if (mimeType === 'image/png' || mimeType === 'image/jpeg') {
              // Embed image as a new page
              const imagePage = pdfDoc.addPage([595, 842]);
              let image;

              if (mimeType === 'image/png') {
                image = await pdfDoc.embedPng(bytes);
              } else {
                image = await pdfDoc.embedJpg(bytes);
              }

              const imageDims = image.scale(1);
              const scale = Math.min(
                (imagePage.getWidth() - 100) / imageDims.width,
                (imagePage.getHeight() - 100) / imageDims.height
              );

              const scaledWidth = imageDims.width * scale;
              const scaledHeight = imageDims.height * scale;

              imagePage.drawImage(image, {
                x: (imagePage.getWidth() - scaledWidth) / 2,
                y: (imagePage.getHeight() - scaledHeight) / 2,
                width: scaledWidth,
                height: scaledHeight,
              });
            }
          } catch (error) {
            console.error('Failed to process attachment:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Download PDF
    const link = document.createElement('a');
    link.href = url;
    link.download = `Petty_Cash_${recordData.date}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Attempt to print - with proper cleanup and error handling
    let printWarning: string | undefined;
    try {
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        printWarning = 'Print dialog was blocked by your browser. Please allow popups and try again, or open the downloaded PDF manually to print.';
      } else {
        // Set up cleanup after print dialog closes or after timeout
        let cleanupDone = false;
        const cleanup = () => {
          if (!cleanupDone) {
            cleanupDone = true;
            URL.revokeObjectURL(url);
          }
        };

        // Try to detect when print dialog closes
        printWindow.onload = () => {
          try {
            printWindow.print();
            // Clean up after a delay to allow print dialog to open
            setTimeout(cleanup, 5000);
          } catch (error) {
            console.error('Print error:', error);
            cleanup();
          }
        };

        // Fallback cleanup after 10 seconds
        setTimeout(cleanup, 10000);
      }
    } catch (error) {
      console.error('Failed to open print dialog:', error);
      printWarning = 'Could not open print dialog. The PDF has been downloaded successfully. Please open it manually to print.';
      URL.revokeObjectURL(url);
    }

    // If print was blocked or failed, still clean up after download completes
    if (printWarning) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return {
      success: true,
      printWarning,
    };
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function detectMimeType(bytes: Uint8Array): string {
  // Check PDF signature
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  // Check PNG signature
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }

  // Check JPEG signature
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}
