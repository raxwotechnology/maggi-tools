import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../logo.png';
import { amountToWords } from './numberToWords';
import api from '../services/api';
import { toast } from './feedback';

const COMPANY_DETAILS = {
  name: 'MAGGI TOOLS',
  address: 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.',
  phones: ['+94 777 782 015', '+94 773 123 073', '+94 707 782 015', '+94 777 778 845'],
  email: 'sampathperera253@gmail.com',
  regNo: '73330'
};

const THEME = {
  primary: [15, 78, 148],   // Corporate Blue
  secondary: [237, 125, 49], // Vibrant Orange
  light: [248, 250, 252], 
  text: [30, 41, 59]
};

const normalizeLogoForJsPDF = (logo) => {
  try {
    if (!logo || typeof logo !== 'string') return null;
    // Expect settings.logo from Settings.jsx to be a data URL
    const match = logo.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
    if (!match) {
      return { data: logo, format: 'PNG' };
    }
    const ext = match[1].toLowerCase();
    const format = ext === 'jpeg' || ext === 'jpg' ? 'JPEG' : 'PNG';
    return { data: logo, format };
  } catch {
    return null;
  }
};

// Helper for positioning between tables
const safeGetY = (doc, fallback = 160) => {
  if (doc.lastAutoTable && doc.lastAutoTable.finalY) return doc.lastAutoTable.finalY;
  return fallback;
};

const drawHeader = (doc, title, subtitle = 'OFFICIAL DOCUMENT') => {
  const pageWidth = doc.internal.pageSize.width;
  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.6);
  doc.line(15, 52, pageWidth - 15, 52);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text(title.toUpperCase(), 15, 60);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle.toUpperCase(), pageWidth - 15, 60, { align: 'right' });
};

const drawFooter = (doc, settings = COMPANY_DETAILS, pageNumber = 1, totalPages = 1) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const footerStart = pageHeight - 36;

  // Thin clean accent line across the full margin width (15 to 195)
  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.5);
  doc.line(15, footerStart, pageWidth - 15, footerStart);

  const textY = footerStart + 7;

  // Column 1: Hotline & Support (x = 15, width = 56)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('HOTLINE & SUPPORT', 15, textY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.text);
  const rawPhones = (settings.phones && settings.phones.length > 0
    ? settings.phones
    : (settings.phone ? [settings.phone] : COMPANY_DETAILS.phones)
  ).filter(Boolean);
  const phoneLine1 = rawPhones.slice(0, 2).join('   |   ') || '+94 777 782 015';
  const phoneLine2 = rawPhones.slice(2, 4).join('   |   ');
  doc.text(phoneLine1, 15, textY + 4.5);
  if (phoneLine2) doc.text(phoneLine2, 15, textY + 8.5);

  // Column 2: Email & Web (x = 77, width = 56)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('EMAIL & INQUIRIES', 77, textY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.text);
  doc.text(settings.email || COMPANY_DETAILS.email || 'sampathperera253@gmail.com', 77, textY + 4.5);
  doc.text(`Business Reg: ${settings.regNo || COMPANY_DETAILS.regNo || '73330'}`, 77, textY + 8.5);

  // Column 3: Store Location (x = 139, width = 56)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('STORE LOCATION', 139, textY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.text);
  const addr = doc.splitTextToSize(settings.address || COMPANY_DETAILS.address || 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.', 56);
  doc.text(addr, 139, textY + 4.5, { lineHeightFactor: 1.15 });

  // Bottom Sub-bar: Centered company credit & Page number
  const bottomY = pageHeight - 7;
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Computer Generated Invoice • ${settings.companyName || COMPANY_DETAILS.name} • Mirihana, Kotte`, 15, bottomY);
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 15, bottomY, { align: 'right' });
};

const drawContactHeader = (doc, settings, pageWidth) => {
  const contactRight = pageWidth - 15;
  const rawPhones = (settings.phones && settings.phones.length > 0
    ? settings.phones
    : (settings.phone ? [settings.phone] : COMPANY_DETAILS.phones)
  ).filter(Boolean);
  
  // Format phones cleanly in pairs to prevent trailing pipes and awkward wrapping
  const phoneLine1 = rawPhones.slice(0, 2).join('   |   ') || '+94 777 782 015';
  const phoneLine2 = rawPhones.slice(2, 4).join('   |   ');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('CONTACT & INQUIRIES', contactRight, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.text);
  
  let lineY = 23.5;
  doc.text(phoneLine1, contactRight, lineY, { align: 'right' });
  lineY += 4.2;
  if (phoneLine2) {
    doc.text(phoneLine2, contactRight, lineY, { align: 'right' });
    lineY += 4.2;
  }
  doc.text(settings.email || COMPANY_DETAILS.email || 'sampathperera253@gmail.com', contactRight, lineY, { align: 'right' });
  lineY += 4.2;
  doc.text(settings.address || COMPANY_DETAILS.address || 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.', contactRight, lineY, { align: 'right' });
};

const safeDate = (d) => {
    try {
        if (!d) return '--/--/----';

        const date = new Date(d);

        if (isNaN(date.getTime())) {
            return '--/--/----';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}/${month}/${day}`;
    } catch {
        return '--/--/----';
    }
};

const getDynamicSettings = async () => {
  try {
    const res = await api.get('settings');
    return res.data;
  } catch (e) { console.warn('Settings fetch failed, using defaults'); }
  return COMPANY_DETAILS;
};

export const generateInvoicePDF = async (invoice, mode = 'download') => {
  const settings = await getDynamicSettings();
  const activeLogo = settings.logo || logoUrl;
  
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Add Logo (supports PNG/JPEG data URLs or local files with aspect ratio preservation)
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = activeLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => {
          if (activeLogo !== logoUrl) {
            img.src = logoUrl;
            img.onload = resolve;
            img.onerror = resolve;
          } else {
            resolve();
          }
        };
      });

      if (img.width && img.height) {
        const maxW = 36;
        const maxH = 32;
        const ratio = img.width / img.height;
        let pdfW = maxW;
        let pdfH = maxH;
        if (ratio >= maxW / maxH) {
          pdfW = maxW;
          pdfH = maxW / ratio;
        } else {
          pdfH = maxH;
          pdfW = maxH * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        doc.addImage(dataUrl, 'PNG', 15, 12, pdfW, pdfH, undefined, 'FAST');
      }
    } catch (e) {
      console.warn("Logo skipped or format invalid", e);
    }

    drawContactHeader(doc, settings, pageWidth);
    drawHeader(doc, 'Tool Rental Invoice', 'Official Receipt & Tax Invoice');

    // Invoice metadata and customer details: 2 equal-width cards
    const cardWidth = (pageWidth - 30 - 6) / 2; // 87mm
    const cardHeight = 28;
    const cardY = 64;

    doc.setFillColor(...THEME.light);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, cardY, cardWidth, cardHeight, 2.5, 2.5, 'FD');
    doc.roundedRect(15 + cardWidth + 6, cardY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

    // Left Card: Invoice Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.primary);
    doc.text('INVOICE DETAILS', 20, cardY + 7);

    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.text);
    doc.text(invoice.invoiceNo || 'DRAFT', 20, cardY + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Date: ${safeDate(invoice.date)}     Status: ${(invoice.status || 'DRAFT').toUpperCase()}`, 20, cardY + 19);
    
    const invoiceDays = Number(invoice.totalDays || invoice.totalUnits || 1);
    const periodText = (invoice.pickupDate || invoice.returnDate)
      ? `Rental Period: ${safeDate(invoice.pickupDate)} - ${safeDate(invoice.returnDate)} (${invoiceDays} Days)`
      : `Rental Duration: ${invoiceDays} Days`;
    doc.text(periodText, 20, cardY + 24.5);

    // Right Card: Customer Information
    const rightCardX = 15 + cardWidth + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.primary);
    doc.text('CUSTOMER (BILL TO)', rightCardX + 5, cardY + 7);

    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.text);
    doc.text(invoice.clientName || invoice.customerName || 'VALUED CUSTOMER', rightCardX + 5, cardY + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const clientContact = [
      invoice.clientPhone || invoice.customerPhone,
      invoice.clientNic ? `NIC: ${invoice.clientNic}` : (invoice.customerNic ? `NIC: ${invoice.customerNic}` : (invoice.toolNo ? `Tool: ${invoice.toolNo}` : ''))
    ].filter(Boolean).join('   |   ');
    doc.text(clientContact || 'No contact specified', rightCardX + 5, cardY + 19);
    doc.text(invoice.clientAddress || invoice.customerAddress || 'Customer Site / Standard Handover', rightCardX + 5, cardY + 24.5);

    const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const itemsTableData = [];

    // Populate Itemized Tools
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, idx) => {
        const itemQty = Number(item.quantity || 1);
        const itemDays = Number(item.rentalDays || invoice.totalDays || invoiceDays);
        const itemRate = Number(item.dailyRate || item.ratePerUnit || 0);
        const lineTotal = itemRate * itemQty * itemDays;

        let toolInfo = item.toolNumber ? `Tool #${item.toolNumber}` : `Tool ${idx + 1}`;
        if (item.model) toolInfo += ` - ${item.model}`;
        if (item.category && !item.model) toolInfo += ` (${item.category})`;
        if (item.returnStatus === 'Overdue' && (invoice.totalOverdueCharges > 0 || item.overdueCharges > 0)) {
          toolInfo += ' [OVERDUE]';
        }

        const subDetail = item.category && item.model ? `Category: ${item.category}` : '';

        itemsTableData.push([
          idx + 1,
          subDetail ? `${toolInfo}\n${subDetail}` : toolInfo,
          Number(itemRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          itemQty,
          itemDays,
          Number(lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]);
      });
    } else if (invoice.toolNo) {
      // Legacy single-tool support
      const quantity = Number(invoice.totalUnits || invoice.quantity || 1);
      const rate = Number(invoice.dailyRate || invoice.ratePerUnit || 0);
      const lineTotal = rate * quantity * invoiceDays;
      let toolInfo = `Tool #${invoice.toolNo}`;
      if (invoice.toolCategory) toolInfo += ` - ${invoice.toolCategory}`;

      itemsTableData.push([
        1,
        toolInfo,
        Number(rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        quantity,
        invoiceDays,
        Number(lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ]);
    }

    // Populate Accessories / Parts
    if (invoice.accessories && invoice.accessories.length > 0) {
      invoice.accessories.forEach((acc) => {
        const accQty = Number(acc.quantity || 1);
        const accPrice = Number(acc.price || 0);
        const accAmount = accPrice * accQty * invoiceDays;
        let accName = acc.name || 'Accessory';
        if (acc.number) accName = `[${acc.number}] ${accName}`;

        itemsTableData.push([
          itemsTableData.length + 1,
          `Accessory: ${accName}`,
          Number(accPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          accQty,
          invoiceDays,
          Number(accAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]);
      });
    }

    if (itemsTableData.length === 0) {
      itemsTableData.push(['-', 'No rental items recorded', '-', '-', '-', '0.00']);
    }

    // Render Main Items Table
    autoTable(doc, {
      startY: cardY + cardHeight + 6,
      head: [['#', 'ITEM / TOOL DESCRIPTION', 'RATE / DAY', 'QTY', 'DAYS', 'AMOUNT (LKR)']],
      body: itemsTableData,
      theme: 'grid',
      headStyles: {
        fillColor: THEME.primary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3.2
      },
      bodyStyles: {
        fontSize: 8,
        textColor: THEME.text,
        cellPadding: 2.8,
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15, bottom: 44 }
    });

    // Summary Calculations
    const serviceTotal = invoice.items && invoice.items.length > 0
      ? invoice.items.reduce((sum, it) => sum + ((Number(it.dailyRate || it.ratePerUnit || 0)) * Number(it.rentalDays || it.totalUnits || invoiceDays) * Number(it.quantity || 1)), 0)
      : (invoiceDays) * Number(invoice.dailyRate || invoice.ratePerUnit || 0) * Number(invoice.totalUnits || invoice.quantity || 1);
        
    const accTotal = (invoice.accessories || []).reduce((sum, a) => sum + (Number(a.price || 0) * Number(a.quantity || 1) * invoiceDays), 0);
    const subtotalItemsAndParts = serviceTotal + accTotal;

    const transportTotal = Number(invoice.transportCharge || 0) + Number(invoice.otherCharges || 0);
    const fuel = Number(invoice.fuelCharge || 0);
    const labour = Number(invoice.labourCharge || 0);
    const deposit = Number(invoice.securityDeposit || 0);
    const overdue = Number(invoice.totalOverdueCharges || 0);
    const discount = Number(invoice.discount || 0);
    const grandTotal = Number(invoice.totalAmount || 0);
    const advancePaid = Number(invoice.advancePayment || 0);
    const balanceDue = Number(invoice.balanceAmount != null ? invoice.balanceAmount : (grandTotal - advancePaid));

    const pageHeight = doc.internal.pageSize.height;
    let currentY = safeGetY(doc, 140);

    // Prevent footer collision: Add page if not enough vertical space for summary
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = 20;
    }

    const startSummaryY = currentY + 4;
    const leftBoxX = 15;
    const leftBoxWidth = 86;
    const summaryBoxX = 107;

    // Financial Summary Rows
    const summaryRows = [
      ['Subtotal (Tools & Parts)', formatMoney(subtotalItemsAndParts)],
      ...(transportTotal > 0 ? [['Transport & Delivery', formatMoney(transportTotal)]] : []),
      ...(fuel > 0 ? [[`Fuel / Oil (${invoice.fuelType || 'Fuel'})`, formatMoney(fuel)]] : []),
      ...(labour > 0 ? [[`Labour / Operator (${invoice.operatorName || 'Labour'})`, formatMoney(labour)]] : []),
      ...(deposit > 0 ? [['Security Deposit (Refundable)', formatMoney(deposit)]] : []),
      ...(overdue > 0 ? [['Late Return Charges', `+ ${formatMoney(overdue)}`]] : []),
      ...(discount > 0 ? [['Discount Given', `- ${formatMoney(discount)}`]] : []),
      ['GRAND TOTAL', formatMoney(grandTotal)],
      ['Advance Payment', formatMoney(advancePaid)],
      ['BALANCE DUE', formatMoney(balanceDue)]
    ];

    const grandTotalIdx = summaryRows.findIndex(r => r[0] === 'GRAND TOTAL');
    const balanceDueIdx = summaryRows.findIndex(r => r[0] === 'BALANCE DUE');

    autoTable(doc, {
      startY: startSummaryY,
      margin: { left: summaryBoxX, right: 15 },
      body: summaryRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: THEME.text,
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 48, halign: 'left' },
        1: { cellWidth: 40, halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.row.index === grandTotalIdx) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 8.5;
          data.cell.styles.textColor = THEME.primary;
          data.cell.styles.lineWidth = { top: 0.3, bottom: 0.3 };
          data.cell.styles.lineColor = [203, 213, 225];
        } else if (data.row.index === balanceDueIdx) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 9;
          data.cell.styles.textColor = THEME.secondary;
        } else {
          if (data.column.index === 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const summaryEndY = safeGetY(doc, startSummaryY + 45);
    const boxHeight = Math.max(summaryEndY - startSummaryY, 38);

    // Left Notes & Services Box
    doc.setFillColor(...THEME.light);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftBoxX, startSummaryY, leftBoxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.primary);
    doc.text('RENTAL & SERVICE DETAILS', leftBoxX + 5, startSummaryY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.text);

    let noteY = startSummaryY + 13;
    if (invoice.fuelType && fuel > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Fuel / Oil:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${invoice.fuelType} supplied with machine`, leftBoxX + 24, noteY);
      noteY += 4.5;
    }
    if (invoice.operatorName && labour > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Labour:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      doc.text(`Assigned: ${invoice.operatorName}`, leftBoxX + 24, noteY);
      noteY += 4.5;
    }
    if (deposit > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Deposit:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      doc.text('Refundable upon item return inspection', leftBoxX + 24, noteY);
      noteY += 4.5;
    }

    // Filter out redundant auto-generated summary string of tools to keep the layout clean
    const isAutoGeneratedSummary = typeof invoice.jobDescription === 'string' &&
      invoice.jobDescription.startsWith('Rental:') &&
      invoice.jobDescription.includes('Tools:');
    const cleanNotes = isAutoGeneratedSummary ? '' : (invoice.jobDescription || invoice.notes || '');

    if (cleanNotes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(cleanNotes, leftBoxWidth - 29);
      doc.text(lines, leftBoxX + 24, noteY);
      noteY += lines.length * 4.2;
    }

    if (noteY <= startSummaryY + boxHeight - 8) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('• Please verify tool condition & fuel before handover.', leftBoxX + 5, noteY + 1);
      doc.text('• Return on time to prevent additional daily rental charges.', leftBoxX + 5, noteY + 5.5);
    }

    // Amount in Words
    const wordsY = Math.min(summaryEndY + 7, pageHeight - 44);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.primary);
    doc.text('AMOUNT IN WORDS:', 15, wordsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.text);
    doc.text(doc.splitTextToSize(amountToWords(grandTotal), pageWidth - 30), 15, wordsY + 4.5);

    // Multi-page balanced footer on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(doc, settings, i, totalPages);
    }
    if (mode === 'print') {
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch {
            doc.save(`Invoice_${invoice.invoiceNo || 'New'}.pdf`);
          }
        };
      }
    } else {
      doc.save(`Invoice_${invoice.invoiceNo || 'New'}.pdf`);
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    toast.error('PDF download failed: ' + error.message);
  }
};

export const generateQuotationPDF = async (quote, mode = 'download') => {
  const settings = await getDynamicSettings();
  const activeLogo = settings.logo || logoUrl;
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = activeLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => {
          if (activeLogo !== logoUrl) {
            img.src = logoUrl;
            img.onload = resolve;
            img.onerror = resolve;
          } else {
            resolve();
          }
        };
      });

      if (img.width && img.height) {
        const maxW = 36;
        const maxH = 32;
        const ratio = img.width / img.height;
        let pdfW = maxW;
        let pdfH = maxH;
        if (ratio >= maxW / maxH) {
          pdfW = maxW;
          pdfH = maxW / ratio;
        } else {
          pdfH = maxH;
          pdfW = maxH * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        doc.addImage(dataUrl, 'PNG', 15, 12, pdfW, pdfH, undefined, 'FAST');
      }
    } catch (e) {
      console.warn("Logo skipped or format invalid", e);
    }

    drawContactHeader(doc, settings, pageWidth);

    drawHeader(doc, 'Service Quotation', 'Official Proposal & Cost Estimate');

    // Quotation metadata and customer details: 2 equal-width cards
    const cardWidth = (pageWidth - 30 - 6) / 2;
    const cardHeight = 28;
    const cardY = 64;

    doc.setFillColor(...THEME.light);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, cardY, cardWidth, cardHeight, 2.5, 2.5, 'FD');
    doc.roundedRect(15 + cardWidth + 6, cardY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

    // Left Card: Quotation Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.primary);
    doc.text('QUOTATION DETAILS', 20, cardY + 7);

    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.text);
    doc.text(quote.quotationNo || 'DRAFT', 20, cardY + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Date: ${safeDate(quote.date)}     Status: ${(quote.status || 'DRAFT').toUpperCase()}`, 20, cardY + 19);
    doc.text(`Validity Period: ${quote.validityDays || 30} Days`, 20, cardY + 24.5);

    // Right Card: Customer Information
    const rightCardX = 15 + cardWidth + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.primary);
    doc.text('CUSTOMER (BILL TO)', rightCardX + 5, cardY + 7);

    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.text);
    doc.text(quote.clientName || 'PROSPECTIVE CUSTOMER', rightCardX + 5, cardY + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const clientContact = [
      quote.clientPhone,
      quote.clientNic ? `NIC: ${quote.clientNic}` : ''
    ].filter(Boolean).join('   |   ');
    doc.text(clientContact || 'No contact specified', rightCardX + 5, cardY + 19);
    doc.text(quote.clientAddress || 'Customer Site / Standard Handover', rightCardX + 5, cardY + 24.5);

    const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const itemsTableData = [];

    // Populate Itemized Tools
    const defaultDays = quote.items?.[0]?.days || 1;
    if (Array.isArray(quote.items) && quote.items.length > 0) {
      quote.items.forEach((item, idx) => {
        const itemQty = Number(item.quantity || 1);
        const itemDays = Number(item.days || item.rentalDays || defaultDays);
        const itemRate = Number(item.dailyRate || 0);
        const lineTotal = item.lineTotal != null && item.lineTotal > 0
          ? Number(item.lineTotal)
          : itemRate * itemQty * itemDays;

        let toolInfo = item.toolNumber ? `Tool #${item.toolNumber}` : `Tool ${idx + 1}`;
        if (item.model) toolInfo += ` - ${item.model}`;
        if (item.category && !item.model) toolInfo += ` (${item.category})`;

        const subDetail = item.category && item.model ? `Category: ${item.category}` : '';

        itemsTableData.push([
          idx + 1,
          subDetail ? `${toolInfo}\n${subDetail}` : toolInfo,
          Number(itemRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          itemQty,
          itemDays,
          Number(lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]);
      });
    } else if (quote.toolNo) {
      const quantity = 1;
      const rate = Number(quote.mandatoryCharge || 0);
      const lineTotal = rate * quantity * 1;
      let toolInfo = `Tool #${quote.toolNo}`;
      if (quote.toolCategory) toolInfo += ` - ${quote.toolCategory}`;

      itemsTableData.push([
        1,
        toolInfo,
        Number(rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        quantity,
        1,
        Number(lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ]);
    }

    // Populate Accessories / Parts
    if (Array.isArray(quote.accessories) && quote.accessories.length > 0) {
      quote.accessories.forEach((acc) => {
        const accQty = Number(acc.quantity || 1);
        const accPrice = Number(acc.price || 0);
        const accAmount = accPrice * accQty * defaultDays;
        let accName = acc.name || 'Accessory';
        if (acc.number) accName = `[${acc.number}] ${accName}`;

        itemsTableData.push([
          itemsTableData.length + 1,
          `Accessory: ${accName}`,
          Number(accPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          accQty,
          defaultDays,
          Number(accAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]);
      });
    }

    if (itemsTableData.length === 0) {
      itemsTableData.push(['-', 'No rental items recorded', '-', '-', '-', '0.00']);
    }

    // Render Main Items Table
    autoTable(doc, {
      startY: cardY + cardHeight + 6,
      head: [['#', 'ITEM / TOOL DESCRIPTION', 'RATE / DAY', 'QTY', 'DAYS', 'AMOUNT (LKR)']],
      body: itemsTableData,
      theme: 'grid',
      headStyles: {
        fillColor: THEME.primary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3.2
      },
      bodyStyles: {
        fontSize: 8,
        textColor: THEME.text,
        cellPadding: 2.8,
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15, bottom: 44 }
    });

    // Summary Calculations
    const serviceTotal = Array.isArray(quote.items) && quote.items.length > 0
      ? quote.items.reduce((sum, it) => {
          const lTot = Number(it.lineTotal);
          return sum + (!isNaN(lTot) && lTot > 0 ? lTot : Number(it.dailyRate || 0) * Number(it.quantity || 1) * Number(it.days || 1));
        }, 0)
      : Number(quote.mandatoryCharge || 0);

    const accTotal = (quote.accessories || []).reduce(
      (sum, a) => sum + (Number(a.price || 0) * Number(a.quantity || 1) * defaultDays),
      0
    );
    const subtotalItemsAndParts = serviceTotal + accTotal;

    const transportTotal = Number(quote.transportCharge || 0);
    const fuel = Number(quote.fuelCharge || 0);
    const labour = Number(quote.labourCharge || 0);
    const otherCharges = Number(quote.otherCharges || 0);
    const deposit = Number(quote.refundableDeposit || 0);
    const discount = Number(quote.discount || 0);
    const grandTotal = Number(quote.estimatedTotal != null ? quote.estimatedTotal : Math.max(0, subtotalItemsAndParts + transportTotal + fuel + labour + otherCharges - discount));

    const pageHeight = doc.internal.pageSize.height;
    let currentY = safeGetY(doc, 140);

    // Prevent footer collision: Add page if not enough vertical space for summary
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = 20;
    }

    const startSummaryY = currentY + 4;
    const leftBoxX = 15;
    const leftBoxWidth = 86;
    const summaryBoxX = 107;

    // Financial Summary Rows
    const summaryRows = [
      ['Subtotal (Tools & Parts)', formatMoney(subtotalItemsAndParts)],
      ...(transportTotal > 0 ? [['Transport & Delivery', formatMoney(transportTotal)]] : []),
      ...(fuel > 0 ? [[`Fuel / Oil (${quote.fuelType || 'Fuel'})`, formatMoney(fuel)]] : []),
      ...(labour > 0 ? [[`Labour / Operator (${quote.operatorName || 'Labour'})`, formatMoney(labour)]] : []),
      ...(otherCharges > 0 ? [['Other / Mandatory Charges', formatMoney(otherCharges)]] : []),
      ...(deposit > 0 ? [['Security Deposit (Refundable)', formatMoney(deposit)]] : []),
      ...(discount > 0 ? [['Discount Given', `- ${formatMoney(discount)}`]] : []),
      ['ESTIMATED TOTAL', formatMoney(grandTotal)]
    ];

    const grandTotalIdx = summaryRows.findIndex(r => r[0] === 'ESTIMATED TOTAL');

    autoTable(doc, {
      startY: startSummaryY,
      margin: { left: summaryBoxX, right: 15 },
      body: summaryRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: THEME.text,
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 48, halign: 'left' },
        1: { cellWidth: 40, halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.row.index === grandTotalIdx) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 8.5;
          data.cell.styles.textColor = THEME.primary;
          data.cell.styles.lineWidth = { top: 0.3, bottom: 0.3 };
          data.cell.styles.lineColor = [203, 213, 225];
        } else {
          if (data.column.index === 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const summaryEndY = safeGetY(doc, startSummaryY + 45);
    const boxHeight = Math.max(summaryEndY - startSummaryY, 38);

    // Left Notes & Services Box (RENTAL & SERVICE DETAILS)
    doc.setFillColor(...THEME.light);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftBoxX, startSummaryY, leftBoxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.primary);
    doc.text('RENTAL & SERVICE DETAILS', leftBoxX + 5, startSummaryY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.text);

    let noteY = startSummaryY + 13;
    if (quote.fuelType || fuel > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Fuel / Oil:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${quote.fuelType || 'Engine Oil'} supplied with machine`, leftBoxX + 24, noteY);
      noteY += 4.5;
    }
    if (quote.operatorName || labour > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Labour:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      const opText = quote.operatorName?.startsWith('Assigned') ? quote.operatorName : `Assigned: ${quote.operatorName || 'Labour'}`;
      doc.text(opText, leftBoxX + 24, noteY);
      noteY += 4.5;
    }
    if (deposit > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Deposit:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      doc.text('Refundable upon item return inspection', leftBoxX + 24, noteY);
      noteY += 4.5;
    }

    const cleanNotes = quote.termsAndConditions || '';
    if (cleanNotes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Terms:', leftBoxX + 5, noteY);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(cleanNotes, leftBoxWidth - 29);
      doc.text(lines.slice(0, 3), leftBoxX + 24, noteY);
      noteY += Math.min(lines.length, 3) * 4.2;
    }

    if (noteY <= startSummaryY + boxHeight - 8) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('• Please verify tool condition & fuel before handover.', leftBoxX + 5, noteY + 1);
      doc.text('• Return on time to prevent additional daily rental charges.', leftBoxX + 5, noteY + 5.5);
    }

    // Amount in Words
    const wordsY = Math.min(summaryEndY + 7, pageHeight - 44);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.primary);
    doc.text('AMOUNT IN WORDS:', 15, wordsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.text);
    doc.text(doc.splitTextToSize(amountToWords(grandTotal), pageWidth - 30), 15, wordsY + 4.5);

    // Multi-page balanced footer on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(doc, settings, i, totalPages);
    }
    if (mode === 'print') {
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch {
            doc.save(`Quotation_${quote.quotationNo || 'New'}.pdf`);
          }
        };
      }
    } else {
      doc.save(`Quotation_${quote.quotationNo || 'New'}.pdf`);
    }
  } catch (error) {
    console.error('Quotation PDF error:', error);
    toast.error('PDF download failed: ' + error.message);
  }
};
