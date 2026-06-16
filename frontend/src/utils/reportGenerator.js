import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../logo.png';

export const generatePDFReport = ({ title, columns, data, filename }) => {
  // Auto-detect orientation based on column count
  // If more than 8 columns, we use Landscape to prevent squashing
  const isLandscape = columns.length > 8;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Calculate dynamic font size based on column density
  let fontSize = 9;
  if (columns.length > 15) fontSize = 6;
  else if (columns.length > 12) fontSize = 7;
  else if (columns.length > 8) fontSize = 8;

  const drawReportContent = (logoBase64, imgW = 0, imgH = 0) => {
    // ---- HEADER ----
    const pageWidth = doc.internal.pageSize.width;
    let textStartX = 14;

    if (logoBase64 && imgW > 0 && imgH > 0) {
      // Center logo vertically in the 30mm header space
      const logoY = 10 + (22 - imgH) / 2;
      doc.addImage(logoBase64, 'PNG', 14, logoY, imgW, imgH, undefined, 'FAST');
      textStartX = 14 + imgW + 6; // Move text to the right of the logo
    }

    // Company Title
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Professional Blue
    doc.setFont('helvetica', 'bold');
    doc.text('Maggi Tool Rentals', textStartX, 20);

    // Subtitle / Slogan
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'italic');
    doc.text('Professional Tool Rental & Management', textStartX, 26);

    // Company Contact aligned to Right
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    // Using a darker grey for better contrast and print readability
    doc.setTextColor(60);
    doc.text('123 Main Street, Colombo', pageWidth - 14, 16, { align: 'right' });
    doc.text('Phone: +94 77 123 4567', pageWidth - 14, 21, { align: 'right' });
    doc.text('Email: info@maggitoolrentals.com', pageWidth - 14, 26, { align: 'right' });

    // Divider Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);

    // ---- REPORT TITLE & DATE ----
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 44);

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date & Time: ${new Date().toLocaleString()}`, pageWidth - 14, 44, { align: 'right' });

    // ---- TABLE ----
    autoTable(doc, {
      startY: 50,
      head: [columns],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: fontSize,
        cellPadding: isLandscape ? 2 : 4,
        font: 'helvetica',
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [37, 99, 235], // Blue Header
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { top: 50, left: 14, right: 14, bottom: 20 },
      didDrawPage: (hookData) => {
        // Footer section for each page
        const pageCount = doc.internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Maggi Tool Rental System - Confidential Report', 14, pageHeight - 10);
        doc.text(`Page | ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    });

    // Print PDF directly
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  // Process Logo Image
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = logoUrl;

  img.onload = () => {
    try {
      // Draw to canvas to get base64 and resize to avoid giant PDF file sizes
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 200;
      let scaleSize = 1;

      if (img.width > MAX_WIDTH) {
        scaleSize = MAX_WIDTH / img.width;
      }

      canvas.width = img.width * scaleSize;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      // Calculate dimensions in mm for PDF (max width 35mm, max height 22mm)
      let pdfW = 35;
      let pdfH = (img.height / img.width) * pdfW;

      if (pdfH > 22) {
        pdfH = 22;
        pdfW = (img.width / img.height) * pdfH;
      }

      drawReportContent(dataUrl, pdfW, pdfH);
    } catch (error) {
      console.warn("Could not generate base64 logo for PDF", error);
      drawReportContent(null);
    }
  };

  img.onerror = () => {
    console.warn("Logo failed to load for PDF");
    drawReportContent(null);
  };
};

export const generateInvoicePDF = (data, type = 'invoice') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const isQuote = type === 'quotation';

  // Header: Company Logo & Info
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('Maggi Tool Rentals', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Tool Rental & Management', 14, 26);

  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text('123 Main Street, Colombo', pageWidth - 14, 16, { align: 'right' });
  doc.text('Phone: +94 77 123 4567', pageWidth - 14, 21, { align: 'right' });
  doc.text('Email: info@maggitoolrentals.com', pageWidth - 14, 26, { align: 'right' });

  doc.setDrawColor(200);
  doc.line(14, 32, pageWidth - 14, 32);

  // Invoice Title
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text(isQuote ? 'RENTAL QUOTATION' : 'RENTAL INVOICE / BILL', 14, 45);

  // Bill Details Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(isQuote ? 'QUOTE FOR:' : 'BILL TO:', 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName || 'Customer', 14, 60);
  doc.text(data.clientPhone || '—', 14, 65);
  doc.text(data.clientNic || '—', 14, 70);

  doc.setFont('helvetica', 'bold');
  doc.text(isQuote ? 'QUOTATION DETAILS:' : 'INVOICE DETAILS:', pageWidth - 14, 55, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`${isQuote ? 'Quote' : 'Invoice'} #: ${data.bookingId || data._id?.substring(0, 8) || 'N/A'}`, pageWidth - 14, 60, { align: 'right' });
  doc.text(`Date: ${new Date(data.pickupDate || Date.now()).toLocaleDateString()}`, pageWidth - 14, 65, { align: 'right' });
  doc.text(`Duration: ${data.totalDays || 1} Day(s)`, pageWidth - 14, 70, { align: 'right' });

  // Items Table
  const tableHeaders = [['DESCRIPTION', 'RATE', 'DAYS', 'TOTAL']];
  const tableRows = [];

  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(it => {
      tableRows.push([
        `${it.toolNumber} - ${it.model || ''}`,
        `LKR ${(it.dailyRate || 0).toLocaleString()}`,
        data.totalDays || 1,
        `LKR ${((it.dailyRate || 0) * (data.totalDays || 1)).toLocaleString()}`
      ]);
    });
  }

  if (data.accessories && Array.isArray(data.accessories)) {
    data.accessories.forEach(acc => {
      tableRows.push([
        `Accessory: ${acc.name}`,
        `LKR ${(acc.price || 0).toLocaleString()}`,
        acc.quantity || 1,
        `LKR ${((acc.price || 0) * (acc.quantity || 1)).toLocaleString()}`
      ]);
    });
  }

  autoTable(doc, {
    startY: 80,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: isQuote ? [100, 100, 100] : [37, 99, 235], textColor: 255 },
    styles: { fontSize: 9 }
  });

  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 10;

  // Summary Section
  const labelX = pageWidth - 80;
  const valueX = pageWidth - 14;
  doc.setFontSize(10);
  doc.text('Estimated Subtotal:', labelX, finalY);
  const subtotal = (data.totalAmount || 0) + (data.discount || 0) - (data.transportCharge || 0);
  doc.text(`LKR ${subtotal.toLocaleString()}`, valueX, finalY, { align: 'right' });
  
  doc.text('Transport:', labelX, finalY + 6);
  doc.text(`LKR ${(data.transportCharge || 0).toLocaleString()}`, valueX, finalY + 6, { align: 'right' });
  
  if ((data.discount || 0) > 0) {
    doc.setTextColor(34, 197, 94);
    doc.text('Discount:', labelX, finalY + 12);
    doc.text(`- LKR ${(data.discount || 0).toLocaleString()}`, valueX, finalY + 12, { align: 'right' });
    doc.setTextColor(30);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(isQuote ? 'ESTIMATED TOTAL:' : 'NET TOTAL:', labelX, finalY + 20);
  doc.text(`LKR ${(data.totalAmount || 0).toLocaleString()}`, valueX, finalY + 20, { align: 'right' });

  if (!isQuote) {
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text('Advance Paid:', labelX, finalY + 28);
    doc.text(`LKR ${(data.advancePayment || 0).toLocaleString()}`, valueX, finalY + 28, { align: 'right' });

    doc.setFontSize(12);
    if ((data.balanceAmount || 0) > 0) {
      doc.setTextColor(220, 38, 38); // Red
    } else {
      doc.setTextColor(22, 163, 74); // Green
    }
    doc.text('BALANCE DUE:', labelX, finalY + 36);
    doc.text(`LKR ${Math.max(0, data.balanceAmount || 0).toLocaleString()}`, valueX, finalY + 36, { align: 'right' });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('* This is an estimated price. Subject to change.', 14, finalY + 30);
    doc.text('* Valid for 7 days from the date of quotation.', 14, finalY + 35);
  }

  // Footer / Terms
  const footerY = doc.internal.pageSize.height - 40;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Terms & Conditions:', 14, footerY);
  doc.text('1. Tools should be returned in the same condition as received.', 14, footerY + 5);
  doc.text('2. Late returns will incur additional daily charges.', 14, footerY + 10);
  doc.text('3. Loss or damage to tools must be compensated by the customer.', 14, footerY + 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Authorized Signature', pageWidth - 14, footerY + 15, { align: 'right' });
  doc.setDrawColor(150);
  doc.line(pageWidth - 60, footerY + 10, pageWidth - 14, footerY + 10);

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
