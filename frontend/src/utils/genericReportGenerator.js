import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../logo.png';
import api from '../services/api';
import { toast } from './feedback';

const THEME = {
  primary: [15, 78, 148],   // Corporate Blue
  secondary: [237, 125, 49], // Vibrant Orange
  light: [248, 250, 252], 
  text: [30, 41, 59],
  border: [226, 232, 240]
};

const DEFAULT_SETTINGS = {
  companyName: 'MAGGI TOOLS',
  address: 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.',
  phones: ['+94 777 782 015', '+94 773 123 073', '+94 707 782 015', '+94 777 778 845'],
  email: 'sampathperera253@gmail.com'
};

export const getDynamicSettings = async () => {
  try {
    const res = await api.get('settings');
    if (res.data) {
      return {
        ...DEFAULT_SETTINGS,
        ...res.data
      };
    }
  } catch (e) { console.warn('Settings fetch failed, using defaults', e); }
  return DEFAULT_SETTINGS;
};

/**
 * Extract clean text recursively from React elements, strings, numbers, or objects
 */
export const extractTextFromNode = (val) => {
  if (val === null || val === undefined || typeof val === 'boolean') return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val).trim();
  if (Array.isArray(val)) {
    return val.map(extractTextFromNode).filter(Boolean).join(' ').trim();
  }
  if (React.isValidElement(val)) {
    return extractTextFromNode(val.props?.children);
  }
  if (typeof val === 'object') {
    return val.text || val.label || val.name || val.number || val.id || '';
  }
  return String(val).trim();
};

export const generateGenericReportPDF = async (title, columns, data, orientation, mode = 'download') => {
  const settings = await getDynamicSettings();
  const activeLogo = settings.logo || logoUrl;
  
  try {
    const filteredCols = (columns || []).filter(c => c !== 'ACTION' && c !== 'VIEW');
    const finalOrientation = orientation || (filteredCols.length > 7 ? 'landscape' : 'portrait');

    const doc = new jsPDF({
      orientation: finalOrientation,
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // 1. Process Logo Image (dynamic aspect ratio & canvas rendering)
    let logoDataUrl = null;
    let logoW = 26;
    let logoH = 26;

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
        const maxW = 32;
        const maxH = 24;
        const ratio = img.width / img.height;
        if (ratio >= maxW / maxH) {
          logoW = maxW;
          logoH = maxW / ratio;
        } else {
          logoH = maxH;
          logoW = maxH * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        logoDataUrl = canvas.toDataURL('image/png');
      }
    } catch (e) {
      console.warn('Logo processing skipped:', e);
    }

    const logoTop = 10;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 15, logoTop, logoW, logoH, undefined, 'FAST');
      } catch (e) {
        console.warn('doc.addImage failed, skipping logo', e);
      }
    }

    // 2. Company & Contact Details (Header Right)
    const rawPhones = Array.isArray(settings.phones) && settings.phones.length > 0
      ? settings.phones.filter(Boolean)
      : (settings.phone ? [settings.phone] : DEFAULT_SETTINGS.phones);

    const phoneStr = rawPhones.slice(0, 2).join('   |   ') || '+94 777 782 015';
    const emailStr = settings.email || DEFAULT_SETTINGS.email;
    const addressStr = settings.address || DEFAULT_SETTINGS.address;
    const companyName = settings.companyName || DEFAULT_SETTINGS.companyName;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.primary);
    doc.text('CONTACT US', pageWidth - 15, 16, { align: 'right' });
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(addressStr, pageWidth - 15, 21.5, { align: 'right' });
    doc.text(`Phone: ${phoneStr}`, pageWidth - 15, 26, { align: 'right' });
    doc.text(`Email: ${emailStr}`, pageWidth - 15, 30.5, { align: 'right' });

    // 3. Header Divider Line (Guaranteed to be below logo & contacts)
    const logoBottom = logoDataUrl ? (logoTop + logoH) : 10;
    const contactBottom = 32;
    const lineY = Math.max(logoBottom, contactBottom) + 4; // Always strictly below logo!

    doc.setDrawColor(...THEME.primary);
    doc.setLineWidth(0.6);
    doc.line(15, lineY, pageWidth - 15, lineY);

    // 4. Report Title & Date
    const titleY = lineY + 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.text);
    doc.text(title.toUpperCase(), 15, titleY);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110);
    const generatedDate = new Date();
    const generatedDateText = `${generatedDate.getFullYear()}/${String(generatedDate.getMonth() + 1).padStart(2, '0')}/${String(generatedDate.getDate()).padStart(2, '0')}`;
    doc.text(`Generated on: ${generatedDateText}`, pageWidth - 15, titleY, { align: 'right' });

    // 5. Build Table Rows with Comprehensive Mapping
    const bodyRows = (data || []).map(row => {
      // If row is already an array of values (e.g. from Tools, Employees, Quotations)
      if (Array.isArray(row)) {
        return row.slice(0, filteredCols.length).map(cell => extractTextFromNode(cell));
      }

      // If row is an object
      return filteredCols.map(col => {
        const fieldMap = {
          'ID': ['displayId', 'bookingId', 'id', '_id'],
          'DATE': ['date', 'date_disp', 'pickupDate', 'timestamp'],
          'TIME': ['time', 'time_disp', 'timestamp'],
          'CLIENT': ['clientName', 'client', 'name'],
          'CUSTOMER': ['clientName', 'client', 'name'],
          'TOOL': ['displayTool', 'toolNo', 'toolId', 'tool', 'toolName', 'vehicleNumber', 'vehicle'],
          'AMOUNT': ['amount', 'totalAmount', 'billAmount', 'netPay_val', 'netPay'],
          'TOTAL': ['totalAmount', 'billAmount', 'total', 'displayTotal'],
          'TOTAL AMOUNT': ['totalAmount', 'billAmount', 'total', 'displayTotal'],
          'PAID': ['takenAmount', 'paidAmount', 'advancePayment', 'totalPaid'],
          'ADVANCE': ['advancePayment', 'advance', 'takenAmount'],
          'BALANCE': ['balanceAmount', 'balance', 'openBalance'],
          'STATUS': ['displayStatus', 'status_text', 'status'],
          'BILL#': ['billNumber', 'bill', 'billNo'],
          'INV#': ['invoiceNo', 'displayInvoiceNo', 'invoice', 'invNo'],
          'PICKUP': ['displayPickup', 'pickupDate', 'pickup', 'startDate'],
          'RETURN': ['displayReturn', 'returnDate', 'return', 'endDate'],
          'DAYS': ['totalDays', 'days', 'rentalDays', 'duration'],
          'EMPLOYEE': ['employeeName', 'employee', 'name', 'driver', 'staff'],
          'STAFF': ['driver', 'staff', 'employee', 'employeeName'],
          'NET PAY': ['netPay_val', 'netPay'],
          'BASIC': ['basic'],
          'HOURLY': ['hourlyEarnings', 'hourlyRate', 'hourly'],
          'ALLOWANCE': ['dailyAllowance', 'allowance'],
          'HOURS': ['totalHours', 'hours'],
          'DESCRIPTION': ['description', 'note', 'notes'],
          'CATEGORY': ['category', 'toolCategory'],
          'METHOD': ['paymentMethod', 'method'],
          'TYPE': ['fuelType_disp', 'fuelType', 'type'],
          'QTY/UNITS': ['liters_disp', 'liters', 'quantity', 'qty', 'units'],
          'QTY': ['quantity', 'qty', 'liters', 'units'],
          'TOTAL COST': ['totalCost', 'cost', 'amount'],
          'COST': ['totalCost', 'cost', 'amount'],
          'HIRE AMT': ['hireAmount', 'hireAmt', 'amount'],
          'CITY': ['city', 'location'],
          'ADDRESS': ['address', 'location'],
          'PHONE': ['contact', 'phone', 'phones'],
          'CONTACT': ['contact', 'phone', 'phones'],
          'NIC': ['nic', 'clientNic'],
          'ROLE': ['role', 'designation'],
          'JOINED': ['joined', 'joinDate', 'joinedDate'],
          'USER': ['user', 'userName', 'createdBy'],
          'RECORD TYPE': ['recordType', 'recordtype', 'type', '_type', 'category', 'logType'],
          'REFERENCE': ['reference', 'ref', 'refNo', '_ref']
        };

        let val = '—';

        // Robust Case & Whitespace-Insensitive Key Resolver from row object
        const findValueInRow = (targetKey) => {
          if (!row || typeof row !== 'object') return undefined;
          if (row[targetKey] !== undefined && row[targetKey] !== null && row[targetKey] !== '') {
            return row[targetKey];
          }
          const cleanTarget = String(targetKey).toLowerCase().replace(/[^a-z0-9]/gi, '');
          for (const objKey of Object.keys(row)) {
            const cleanObjKey = String(objKey).toLowerCase().replace(/[^a-z0-9]/gi, '');
            if (cleanObjKey === cleanTarget && row[objKey] !== undefined && row[objKey] !== null && row[objKey] !== '') {
              return row[objKey];
            }
          }
          return undefined;
        };

        // Priority 1: Mapped candidate keys (e.g. TOOL -> displayTool).
        // Checked first so a known display-friendly field always wins over
        // a same-named raw DB field (e.g. row.tool holding a raw ObjectId).
        const normalizedCol = col.toUpperCase().trim();
        const mappedKeys = fieldMap[normalizedCol];
        if (mappedKeys) {
          for (const k of mappedKeys) {
            const candidateVal = findValueInRow(k);
            if (candidateVal !== undefined) {
              val = candidateVal;
              break;
            }
          }
        }

        // Priority 2: Direct/loose key match (only if no mapped field matched)
        if (val === '—') {
          const directVal = findValueInRow(col);
          if (directVal !== undefined) {
            val = directVal;
          } else if (!mappedKeys) {
            const fallbackKeys = [col.toLowerCase().replace(/[^a-z0-9]/gi, ''), col];
            for (const k of fallbackKeys) {
              const candidateVal = findValueInRow(k);
              if (candidateVal !== undefined) {
                val = candidateVal;
                break;
              }
            }
          }
        }

        val = extractTextFromNode(val);
        if (!val && val !== 0) val = '—';

        // Auto date formatting as YYYY/MM/DD
        if (col.includes('DATE') && val !== '—' && !String(val).includes('/')) {
          try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              val = `${year}/${month}/${day}`;
            }
          } catch (_e) {
            // ignore invalid date
          }
        }

        // Auto currency formatting if purely numeric
        const isAmountCol = col.includes('AMOUNT') || col.includes('TOTAL') || col.includes('BALANCE') || 
                            col.includes('PAY') || col.includes('FEE') || col.includes('COST') || 
                            col.includes('DEBIT') || col.includes('CREDIT') || col.includes('HIRE AMT') ||
                            col.includes('BASIC') || col.includes('HOURLY') || col.includes('ALLOWANCE');

        if (isAmountCol && val !== '—' && !String(val).includes('LKR') && !String(val).includes('Rs')) {
          const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num)) {
            val = `LKR ${num.toLocaleString()}`;
          }
        }

        return String(val);
      });
    });

    // 6. Font & Density Settings
    let fontSize = 8;
    if (filteredCols.length > 10) fontSize = 6.5;
    else if (filteredCols.length > 7) fontSize = 7.5;

    const tableStartY = titleY + 6;

    // 7. Render AutoTable
    autoTable(doc, {
      startY: tableStartY,
      head: [filteredCols],
      body: bodyRows,
      theme: 'grid',
      headStyles: {
        fillColor: THEME.primary,
        textColor: [255, 255, 255],
        fontSize: fontSize,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2.8
      },
      bodyStyles: {
        fontSize: fontSize,
        textColor: THEME.text,
        cellPadding: 2.2,
        valign: 'middle'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15, bottom: 20 },
      didDrawPage: () => {
        const totalPages = doc.internal.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setTextColor(140);
        doc.text(`${companyName} Management System`, 15, pageHeight - 10);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
      }
    });

    // 8. Output Document (Download or Direct Print)
    const cleanFilename = `${title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    if (mode === 'print') {
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // Pop-up blocked fallback
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
            doc.save(cleanFilename);
          }
        };
      }
    } else {
      doc.save(cleanFilename);
    }
  } catch (error) {
    console.error('Generic PDF error:', error);
    toast.error('Failed to generate PDF: ' + error.message);
  }
};