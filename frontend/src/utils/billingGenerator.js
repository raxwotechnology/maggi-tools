import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../logo.png';
import { amountToWords } from './numberToWords';
import api from '../services/api';

const COMPANY_DETAILS = {
  name: 'MAGGI TOOLS',
  address: 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.',
  phones: ['+94 775 085 815', '+94 723 627 888', '+94 766 779 603'],
  email: 'info@raxwo.com',
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

const drawHeader = (doc, title) => {
  const pageWidth = doc.internal.pageSize.width;
  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.7);
  doc.line(15, 70, pageWidth - 15, 70);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text(title.toUpperCase(), 15, 65);
};

const drawFooter = (doc, settings = COMPANY_DETAILS) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const footerStart = pageHeight - 50;

  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.5);
  doc.line(18, footerStart, pageWidth - 15, footerStart);

  // Footer Content
  const textY = footerStart + 12;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('CONTACT', 22, textY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.text);
  const phoneText = (settings.phones || COMPANY_DETAILS.phones).filter(Boolean).join('\n');
  const phoneLines = doc.splitTextToSize(phoneText || '0777778845', 45);
  doc.text(phoneLines, 22, textY, { lineHeightFactor: 1.15 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('EMAIL', 75, textY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.text);
  const emailLines = doc.splitTextToSize(settings.email || COMPANY_DETAILS.email, 45);
  doc.text(emailLines, 75, textY, { lineHeightFactor: 1.15 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('ADDRESS', 125, textY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.text);
  const addr = doc.splitTextToSize(settings.address || COMPANY_DETAILS.address, 45);
  doc.text(addr, 125, textY, { lineHeightFactor: 1.15 });
};

const drawContactHeader = (doc, settings, pageWidth) => {
  const phones = (settings.phones || COMPANY_DETAILS.phones).filter(Boolean).join(' | ') || '0777778845';
  const contactRight = pageWidth - 15;
  const phoneLines = doc.splitTextToSize(phones, 100);
  const emailLines = doc.splitTextToSize(settings.email || COMPANY_DETAILS.email, 100);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text('CONTACT US', contactRight, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.text);
  doc.text(phoneLines, contactRight, 29, { align: 'right', lineHeightFactor: 1.15 });
  doc.text(emailLines, contactRight, 36 + ((phoneLines.length - 1) * 4), { align: 'right', lineHeightFactor: 1.15 });
};

const safeDate = (d) => {
    try {
        if (!d) return '--/--/----';
        const date = new Date(d);
        return isNaN(date.getTime()) ? '--/--/----' : date.toLocaleDateString();
    } catch { return '--/--/----'; }
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
  const activeLogo = logoUrl;
  
  console.log('RAXWO Debug: Starting PDF generation for:', invoice.invoiceNo);
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Add Logo (supports PNG/JPEG data URLs or local files)
    try {
      const normalized = normalizeLogoForJsPDF(activeLogo);
      if (normalized?.data) {
        doc.addImage(normalized.data, normalized.format, 15, 15, 45, 45);
      } else {
        const img = new Image();
        img.src = logoUrl;
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        doc.addImage(img, 'PNG', 15, 15, 45, 45);
      }
    } catch (e) {
      console.warn("Logo skipped or format invalid");
    }

    drawContactHeader(doc, settings, pageWidth);

    const drawDynamicHeader = (doc, title) => {
      doc.setDrawColor(...THEME.primary);
      doc.setLineWidth(0.7);
      doc.line(15, 70, pageWidth - 15, 70);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...THEME.primary);
      doc.text(title.toUpperCase(), 15, 65);
    };

    drawDynamicHeader(doc, 'Tool Rental Invoice');

    // Invoice metadata and customer details use equal-height cards for a stable layout.
    doc.setFillColor(...THEME.light);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 80, 82, 29, 3, 3, 'FD');
    doc.roundedRect(103, 80, pageWidth - 118, 29, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.primary);
    doc.text('INVOICE DETAILS', 20, 87);
    doc.text('BILL TO', 108, 87);

    doc.setFontSize(10);
    doc.setTextColor(...THEME.text);
    doc.text(invoice.invoiceNo || 'DRAFT', 20, 94);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Date: ${safeDate(invoice.date)}`, 20, 101);
    doc.text(`Status: ${(invoice.status || 'DRAFT').toUpperCase()}`, 58, 101);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(invoice.clientName || 'VALUED CUSTOMER', 108, 94);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const clientContact = [
      invoice.clientPhone,
      invoice.clientNic ? `NIC: ${invoice.clientNic}` : invoice.toolNo ? `Tool: ${invoice.toolNo}` : ''
    ].filter(Boolean).join('  |  ');
    if (clientContact) doc.text(doc.splitTextToSize(clientContact, pageWidth - 130), 108, 101);

    const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

    // Keep the invoice compact and readable with one two-column table.
    const tableData = [];
    const invoiceDays = invoice.totalDays || invoice.totalUnits || 1;

    if ((!invoice.items || invoice.items.length === 0) && invoice.toolNo) {
      const quantity = invoice.totalUnits || invoice.quantity || 1;
      const rate = invoice.dailyRate || invoice.ratePerUnit || 0;
      tableData.push([
        `Tool: ${invoice.toolNo}`,
        `${invoice.toolCategory || 'Tool rental'}\n${quantity} x ${invoiceDays} ${invoice.unitType || 'Days'} @ ${formatMoney(rate)}`
      ]);
      if (invoice.jobDescription) {
        tableData.push(['Service Description', invoice.jobDescription]);
      }
    }

    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, idx) => {
        const itemQty = item.quantity || 1;
        const itemDays = item.rentalDays || invoiceDays;
        const itemRate = item.dailyRate || item.ratePerUnit || 0;
        let desc = `Tool ${idx + 1}: ${item.toolNumber || 'Unspecified'}`;
        if (item.returnStatus === 'Overdue' && invoice.totalOverdueCharges > 0) {
          desc += ' [OVERDUE]';
        }
        tableData.push([
          desc,
          `${item.model || item.category || 'Tool rental'}\n${itemQty} x ${itemDays} ${item.unitType || invoice.unitType || 'Days'} @ ${formatMoney(itemRate)}`
        ]);
      });
      if (invoice.jobDescription) {
        tableData.push(['Service Description', invoice.jobDescription]);
      }
    }

    if (invoice.accessories && invoice.accessories.length > 0) {
      invoice.accessories.forEach(acc => {
        const accQty = acc.quantity || 1;
        const accAmount = (acc.price || 0) * accQty * invoiceDays;
        tableData.push([
          `${acc.number ? `[${acc.number}] ` : ''}Accessory: ${acc.name}`,
          `Accessory rental\n${accQty} x ${invoiceDays} Days @ ${formatMoney(acc.price)}\nAmount: ${formatMoney(accAmount)}`
        ]);
      });
    }

    // Summary Calculations
    const serviceTotal = invoice.items && invoice.items.length > 0
        ? invoice.items.reduce((sum, it) => sum + ((it.dailyRate || it.ratePerUnit || 0) * (it.totalUnits || invoiceDays) * (it.quantity || 1)), 0)
        : (invoiceDays) * (invoice.dailyRate || invoice.ratePerUnit || 0) * (invoice.totalUnits || invoice.quantity || 1);
        
    const accTotal = (invoice.accessories || []).reduce((sum, a) => sum + (a.price * (a.quantity || 1) * invoiceDays), 0);
    const transportTotal = Number(invoice.transportCharge || 0) + Number(invoice.otherCharges || 0);
    
    const summaryRows = [
      ['SUBTOTAL (SERVICES & TOOLS)', formatMoney(serviceTotal)],
      ...(accTotal > 0 ? [['PARTS & ACCESSORIES', formatMoney(accTotal)]] : []),
      ...(transportTotal > 0 ? [['TRANSPORT & OTHER CHARGES', formatMoney(transportTotal)]] : []),
      ...((invoice.totalOverdueCharges || 0) > 0 ? [['LATE RETURN / OVERDUE CHARGES', `+ ${formatMoney(invoice.totalOverdueCharges)}`]] : []),
      ...(invoice.discount > 0 ? [['DISCOUNT GIVEN', `- ${formatMoney(invoice.discount)}`]] : []),
      ['GRAND TOTAL', formatMoney(invoice.totalAmount)],
      ['ADVANCE PAYMENT', formatMoney(invoice.advancePayment)],
      ['BALANCE DUE', formatMoney(invoice.balanceAmount ?? (invoice.totalAmount - (invoice.advancePayment || 0)))]
    ];

    const allRows = [...(tableData.length ? tableData : [['No billing items recorded', '']]), ...summaryRows];
    const summaryStart = allRows.length - summaryRows.length;

    autoTable(doc, {
      startY: 120,
      head: [['BILLING ITEM', 'DESCRIPTION / VALUE']],
      body: allRows,
      theme: 'grid',
      headStyles: { fillColor: THEME.primary, fontSize: 9, cellPadding: 4 },
      bodyStyles: { fontSize: 8.5, textColor: THEME.text, cellPadding: 4, valign: 'middle' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 62 },
        1: { cellWidth: 'auto', halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.row.index >= summaryStart) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 1) data.cell.styles.halign = 'right';
        }
        if (data.row.index === summaryStart + summaryRows.length - 3) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.lineColor = [203, 213, 225];
          data.cell.styles.lineWidth = { top: 0.4, bottom: 0.4 };
        }
        if (data.row.index === summaryStart + summaryRows.length - 1) {
          data.cell.styles.textColor = THEME.secondary;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 9.5;
        }
      },
      margin: { left: 15, right: 15, bottom: 60 }
    });

    const currentY = safeGetY(doc, 220);

    // Amount in Words
    const wordsY = Math.min(currentY + 12, doc.internal.pageSize.height - 62);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.primary);
    doc.text('AMOUNT IN WORDS', 15, wordsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.text);
    doc.text(doc.splitTextToSize(amountToWords(invoice.totalAmount || 0), pageWidth - 30), 15, wordsY + 6);

    drawFooter(doc, settings);
    if (mode === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Invoice_${invoice.invoiceNo || 'New'}.pdf`);
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('PDF download failed: ' + error.message);
  }
};

export const generateQuotationPDF = async (quote, mode = 'download') => {
  const settings = await getDynamicSettings();
  const activeLogo = logoUrl;
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    try {
      const normalized = normalizeLogoForJsPDF(activeLogo);
      if (normalized?.data) {
        doc.addImage(normalized.data, normalized.format, 15, 15, 45, 45);
      } else {
        const img = new Image();
        img.src = logoUrl;
        await new Promise((resolve) => { 
          img.onload = resolve; 
          img.onerror = resolve; 
        });
        doc.addImage(img, 'PNG', 15, 15, 45, 45);
      }
    } catch (e) {
      console.warn("Logo skipped or format invalid");
    }

    drawContactHeader(doc, settings, pageWidth);

    drawHeader(doc, 'Service Quotation');

    // Meta & Client
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`QUOTATION NO: ${quote.quotationNo || 'NEW'}`, 15, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(`VALIDITY: ${quote.validityDays || 30} DAYS`, 15, 91);

    doc.setFillColor(...THEME.light);
    doc.roundedRect(pageWidth - 100, 80, 85, 30, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('FOR CLIENT:', pageWidth - 95, 87);
    doc.setFontSize(11);
    doc.text(quote.clientName || 'PROSPECTIVE CUSTOMER', pageWidth - 95, 94);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.clientAddress || 'No Address Provided', pageWidth - 95, 100, { maxWidth: 75 });

    // Specs / Items Table
    const itemRows = Array.isArray(quote.items) && quote.items.length
      ? quote.items.map((it) => [
          `${it.model || it.toolNumber || 'Tool'}${it.toolNumber ? ` (${it.toolNumber})` : ''}`,
          `${it.quantity || 1} × ${it.days || 1} day(s) @ LKR ${(it.dailyRate || 0).toLocaleString()} = LKR ${(it.lineTotal || 0).toLocaleString()}`
        ])
      : [
          ['Tool Category', quote.toolCategory || 'Any'],
          ['Specific Tool', quote.toolNo || 'Selection'],
          ['Refundable Deposit', `LKR ${(quote.refundableDeposit || 0).toLocaleString()}`]
        ];

    autoTable(doc, {
      startY: 115,
      head: [['ITEM / TOOL', 'RENTAL DETAILS']],
      body: itemRows,
      theme: 'striped',
      headStyles: { fillColor: THEME.primary }
    });
    
    let currentY = safeGetY(doc, 155);

    // Rates Table
    autoTable(doc, {
      startY: currentY + 10,
      head: [['DESCRIPTION OF CHARGES', 'UNIT RATE']],
      body: [
        ['Transport & Mobilization', `LKR ${(quote.transportCharge || 0).toLocaleString()}`],
        ['Other / Base Charge', `LKR ${(quote.mandatoryCharge || 0).toLocaleString()}`],
        ['Extra Usage Rate', `LKR ${(quote.extraHourRate || 0).toLocaleString()}`],
        ...(Number(quote.discount) > 0 ? [['Discount', `- LKR ${Number(quote.discount).toLocaleString()}`]] : []),
        ...(Number(quote.refundableDeposit) > 0 ? [['Refundable Deposit', `LKR ${Number(quote.refundableDeposit).toLocaleString()}`]] : []),
        ['ESTIMATED TOTAL', `LKR ${(quote.estimatedTotal || 0).toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: THEME.primary },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    currentY = safeGetY(doc, currentY + 50);

    // Terms
    const termsY = currentY + 15;
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS:', 15, termsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const terms = doc.splitTextToSize(quote.termsAndConditions || 'Standard terms apply.', pageWidth - 30);
    doc.text(terms, 15, termsY + 6);

    drawFooter(doc, settings);
    if (mode === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Quotation_${quote.quotationNo || 'New'}.pdf`);
    }
  } catch (error) {
    console.error('Quotation PDF error:', error);
    alert('PDF download failed: ' + error.message);
  }
};
