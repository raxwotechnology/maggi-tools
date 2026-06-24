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

// New: Draw the exact detailed criss-cross woven side pattern from the image
const drawSidePattern = (doc) => {
  const pageHeight = doc.internal.pageSize.height;
  const blue = [15, 78, 148];
  const orange = [237, 125, 49];
  
  // 1. Draw the vertical base lines (3 distinct thin bars)
  doc.setFillColor(...blue);
  doc.rect(3, 0, 1.2, pageHeight, 'F');
  
  doc.setFillColor(...orange);
  doc.rect(5.5, 0, 1.2, pageHeight, 'F');
  
  doc.setFillColor(...blue);
  doc.rect(8, 0, 1.2, pageHeight, 'F');

  // 2. Draw the woven criss-cross geometry
  doc.setLineWidth(1.2);
  for (let y = -20; y < pageHeight; y += 15) {
    // Blue Criss-Cross Lines
    doc.setDrawColor(...blue);
    doc.line(3, y, 9.2, y + 15);
    doc.line(3, y + 15, 9.2, y);

    // Orange Criss-Cross Lines (Offset for weaving effect)
    doc.setDrawColor(...orange);
    doc.line(3, y + 7.5, 9.2, y + 22.5);
    doc.line(3, y + 22.5, 9.2, y + 7.5);
  }
  
  // Clean thin blue line on the inner edge
  doc.setFillColor(...blue);
  doc.rect(10.5, 0, 0.5, pageHeight, 'F');
};

// Helper for positioning between tables
const safeGetY = (doc, fallback = 160) => {
  if (doc.lastAutoTable && doc.lastAutoTable.finalY) return doc.lastAutoTable.finalY;
  return fallback;
};

const drawHeader = (doc, title) => {
  const pageWidth = doc.internal.pageSize.width;
  drawSidePattern(doc);

  // Document Title Banner (Stylized)
  doc.setFillColor(241, 245, 249);
  doc.rect(45, 60, pageWidth - 60, 10, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text(title.toUpperCase(), (pageWidth + 45) / 2, 67, { align: 'center', charSpace: 1.5 });
};

const drawFooter = (doc, settings = COMPANY_DETAILS) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const footerStart = pageHeight - 45;

  // Horizontal Line
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.line(18, footerStart, pageWidth - 15, footerStart);

  // Footer Content
  const textY = footerStart + 12;

  // Phone Section
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTACT US', 22, textY - 4);
  doc.setFont('helvetica', 'normal');
  (settings.phones || COMPANY_DETAILS.phones).forEach((p, i) => {
    doc.text(p, 22, textY + (i * 4));
  });

  // Email Section
  doc.setFont('helvetica', 'bold');
  doc.text('EMAIL ADDRESS', 75, textY - 4);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.email || COMPANY_DETAILS.email, 75, textY);

  // Location Section
  doc.setFont('helvetica', 'bold');
  doc.text('VISIT US', 125, textY - 4);
  doc.setFont('helvetica', 'normal');
  const addr = doc.splitTextToSize(settings.address || COMPANY_DETAILS.address, 45);
  doc.text(addr, 125, textY);

  // QR Code Placeholder (Bottom Right)
  doc.setDrawColor(15, 78, 148);
  doc.setLineWidth(0.5);
  doc.rect(pageWidth - 35, footerStart + 5, 20, 20);
  doc.setFontSize(5);
  doc.text('SCAN FOR', pageWidth - 25, footerStart + 15, { align: 'center' });
  doc.text('VERIFICATION', pageWidth - 25, footerStart + 18, { align: 'center' });
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

    // Print Contact Info in header aligned right
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.primary);
    doc.text('CONTACT US', pageWidth - 15, 30, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${(settings.phones && settings.phones.join(' | ')) || '0777778845'}`, pageWidth - 15, 36, { align: 'right' });
    doc.text(`${settings.email || ''}`, pageWidth - 15, 42, { align: 'right' });

    const drawDynamicHeader = (doc, title) => {
      drawSidePattern(doc);
      doc.setFillColor(241, 245, 249);
      doc.rect(45, 60, pageWidth - 60, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...THEME.primary);
      doc.text(title.toUpperCase(), (pageWidth + 45) / 2, 67, { align: 'center', charSpace: 1.5 });
    };

    const drawDynamicFooter = (doc) => {
      const pageHeight = doc.internal.pageSize.height;
      const footerStart = pageHeight - 45;
      doc.setDrawColor(100);
      doc.setLineWidth(0.3);
      doc.line(18, footerStart, pageWidth - 15, footerStart);
      const textY = footerStart + 12;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTACT US', 22, textY - 4);
      doc.setFont('helvetica', 'normal');
      (settings.phones || []).forEach((p, i) => {
        doc.text(p, 22, textY + (i * 4));
      });

      doc.setFont('helvetica', 'bold');
      doc.text('EMAIL ADDRESS', 75, textY - 4);
      doc.setFont('helvetica', 'normal');
      doc.text(settings.email || '', 75, textY);

      doc.setFont('helvetica', 'bold');
      doc.text('VISIT US', 125, textY - 4);
      doc.setFont('helvetica', 'normal');
      const addr = doc.splitTextToSize(settings.address || '', 45);
      doc.text(addr, 125, textY);

      doc.setDrawColor(15, 78, 148);
      doc.setLineWidth(0.5);
      doc.rect(pageWidth - 35, footerStart + 5, 20, 20);
      doc.setFontSize(5);
      doc.text('SCAN FOR', pageWidth - 25, footerStart + 15, { align: 'center' });
      doc.text('VERIFICATION', pageWidth - 25, footerStart + 18, { align: 'center' });
    };

    drawDynamicHeader(doc, 'Tool Rental Invoice');

    // Meta Info
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 80, 105, 26, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.primary);
    doc.text(`INVOICE: ${invoice.invoiceNo || 'DRAFT'}`, 20, 92);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.text);
    doc.text(`DATE: ${safeDate(invoice.date).toUpperCase()}`, 20, 98);
    doc.text(`STATUS: ${(invoice.status || 'DRAFT').toUpperCase()}`, 80, 98);

    // Client Box
    doc.setFillColor(...THEME.light);
    doc.setDrawColor(200);
    doc.roundedRect(pageWidth - 100, 80, 85, 30, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', pageWidth - 95, 87);
    doc.setFontSize(11);
    doc.text(invoice.clientName || 'VALUED CUSTOMER', pageWidth - 95, 94);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (invoice.clientPhone) {
      doc.text(invoice.clientPhone, pageWidth - 95, 100);
    }
    if (invoice.clientNic) {
      doc.text(`NIC: ${invoice.clientNic}`, pageWidth - 95, 105);
    } else if (invoice.toolNo) {
      doc.text(`Tool: ${invoice.toolNo}`, pageWidth - 95, 105);
    }

    // Table Data Construction
    const tableData = [];
    
    // 1. Add Main Tool (Legacy support if items array is empty)
    const invoiceDays = invoice.totalDays || invoice.totalUnits || 1;
    if ((!invoice.items || invoice.items.length === 0) && invoice.toolNo) {
      tableData.push([
        `Tool: ${invoice.toolNo} (${invoice.toolCategory || 'N/A'}) x${invoice.totalUnits || invoice.quantity || 1}`,
        `${invoiceDays} ${invoice.unitType || 'Days'} @ LKR ${(invoice.dailyRate || invoice.ratePerUnit || 0).toLocaleString()}`
      ]);
      tableData.push(['Service Description', invoice.jobDescription || 'Professional Tool Rental Services']);
    }

    // 2. Add Multi-Items
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, idx) => {
        const itemQty = item.quantity || 1;
        const itemDays = item.rentalDays || invoiceDays;
        const itemRate = item.dailyRate || item.ratePerUnit || 0;
        let desc = `Tool ${idx + 1}: ${item.toolNumber || ''} (${item.model || item.category || 'N/A'}) x${itemQty}`;
        if (item.returnStatus === 'Overdue' && invoice.totalOverdueCharges > 0) {
           desc += ' [OVERDUE]';
        }
        tableData.push([
          desc,
          `${itemDays} ${item.unitType || invoice.unitType || 'Days'} @ LKR ${itemRate.toLocaleString()}`
        ]);
      });
      if (invoice.jobDescription) {
        tableData.push(['General Description', invoice.jobDescription]);
      }
    }

    // 3. Add Accessories
    if (invoice.accessories && invoice.accessories.length > 0) {
        invoice.accessories.forEach(acc => {
            const accQty = acc.quantity || 1;
            tableData.push([
                `${acc.number ? `[${acc.number}] ` : ''}Accessory: ${acc.name} (x${accQty}) for ${invoiceDays} days`, 
                `LKR ${(acc.price * accQty * invoiceDays).toLocaleString()}`
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
      ['SUBTOTAL (SERVICES & TOOLS)', `LKR ${serviceTotal.toLocaleString()}`],
      ...(accTotal > 0 ? [['PARTS & ACCESSORIES', `LKR ${accTotal.toLocaleString()}`]] : []),
      ...(transportTotal > 0 ? [['TRANSPORT & OTHER CHARGES', `LKR ${transportTotal.toLocaleString()}`]] : []),
      ...((invoice.totalOverdueCharges || 0) > 0 ? [['LATE RETURN / OVERDUE CHARGES', `+ LKR ${invoice.totalOverdueCharges.toLocaleString()}`]] : []),
      ...(invoice.discount > 0 ? [['DISCOUNT GIVEN', `- LKR ${invoice.discount.toLocaleString()}`]] : []),
      ['GRAND TOTAL', `LKR ${invoice.totalAmount?.toLocaleString()}`],
      ['ADVANCE PAYMENT', `LKR ${invoice.advancePayment?.toLocaleString() || '0'}`],
      ['BALANCE DUE', `LKR ${invoice.balanceAmount?.toLocaleString() || (invoice.totalAmount - (invoice.advancePayment || 0)).toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 120,
      head: [['BILLING ITEM', 'DESCRIPTION / VALUE']],
      body: [...tableData, ...summaryRows],
      theme: 'grid',
      headStyles: { fillColor: THEME.primary, fontSize: 10 },
      columnStyles: { 
        0: { fontStyle: 'bold', width: 60 },
        1: { halign: 'right' }
      },
      didParseCell: (data) => {
        // Style summary rows differently
        const isSummary = data.row.index >= tableData.length;
        if (isSummary) {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.fontStyle = 'bold';
          
          // Extra highlight for Balance Due (Last Row)
          if (data.row.index === (tableData.length + summaryRows.length - 1)) {
            data.cell.styles.textColor = THEME.secondary;
            data.cell.styles.fontSize = 12;
          }
        }
      },
      margin: { bottom: 60 } // Ensure enough space for footer
    });

    let currentY = safeGetY(doc, 220);

    // Amount in Words
    const wordsY = currentY + 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT IN WORDS:', 15, wordsY);
    doc.setFont('helvetica', 'normal');
    doc.text(amountToWords(invoice.totalAmount || 0), 15, wordsY + 6);

    drawDynamicFooter(doc);
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

    // Print Contact Info in header aligned right
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.primary);
    doc.text('CONTACT US', pageWidth - 15, 30, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${(settings.phones && settings.phones.join(' | ')) || '0777778845'}`, pageWidth - 15, 36, { align: 'right' });
    doc.text(`${settings.email || ''}`, pageWidth - 15, 42, { align: 'right' });

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
