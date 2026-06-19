import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../logo.png';
import api from '../services/api';

const THEME = {
  primary: [15, 78, 148],   // Corporate Blue
  secondary: [237, 125, 49], // Vibrant Orange
  light: [248, 250, 252], 
  text: [30, 41, 59],
  border: [226, 232, 240]
};

const getDynamicSettings = async () => {
  try {
    const res = await api.get('settings');
    return res.data;
  } catch (e) { console.warn('Settings fetch failed, using defaults'); }
  return {
    companyName: 'MAGGI TOOL RENTALS',
    address: 'No. 241, Rajamaha Vihara Rd, Mirihana, Kotte.',
    phone: '+94 775 085 815',
    email: 'info@maggitoolrentals.com'
  };
};

export const generateGenericReportPDF = async (title, columns, data, orientation = 'p') => {
  const settings = await getDynamicSettings();
  const activeLogo = logoUrl;
  
  try {
    const doc = new jsPDF(orientation, 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // 1. Header Section
    try {
      const img = new Image();
      img.src = activeLogo;
      await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
      doc.addImage(img, 'PNG', 15, 10, 40, 40);
    } catch (e) { console.warn("Logo skipped"); }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.primary);
    doc.text('CONTACT US', pageWidth - 15, 20, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(settings.address || '', pageWidth - 15, 25, { align: 'right' });
    doc.text(`Phone: ${settings.phone} | Email: ${settings.email}`, pageWidth - 15, 30, { align: 'right' });

    // 2. Report Title & Date
    doc.setDrawColor(...THEME.primary);
    doc.setLineWidth(0.5);
    doc.line(15, 38, pageWidth - 15, 38);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.text);
    doc.text(title.toUpperCase(), 15, 46);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 15, 46, { align: 'right' });

    // 3. Table Data
    const filteredCols = columns.filter(c => c !== 'ACTION');
    const bodyRows = data.map(row => {
      return filteredCols.map(col => {
        // Robust Field Mapping
        const fieldMap = {
            'ID': ['displayId', 'bookingId', 'id', '_id'],
            'DATE': ['date', 'date_disp', 'pickupDate'],
            'CLIENT': ['clientName', 'client', 'name'],
            'CUSTOMER': ['clientName', 'client', 'name'],
            'TOOL': ['displayTool', 'toolNo', 'toolId', 'tool'],
            'AMOUNT': ['amount', 'totalAmount', 'billAmount'],
            'TOTAL': ['totalAmount', 'billAmount', 'total', 'displayTotal'],
            'PAID': ['takenAmount', 'paidAmount', 'advancePayment'],
            'BALANCE': ['balanceAmount', 'balance'],
            'STATUS': ['displayStatus', 'status_text', 'status'],
            'BILL#': ['billNumber', 'bill'],
            'INV#': ['invoiceNo', 'invoice'],
            'EMPLOYEE': ['employeeName', 'employee', 'name'],
            'NET PAY': ['netPay', 'netPay_val']
        };
        
        let val = '—';
        const possibleKeys = fieldMap[col] || [col.toLowerCase().replace(/\s+/g, ''), col];
        
        for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null) {
                val = row[key];
                break;
            }
        }

        // ── Handle React Elements (Extract raw text) ──
        if (React.isValidElement(val)) {
            // Try to find children recursively or use a simple depth-1 check
            if (typeof val.props.children === 'string' || typeof val.props.children === 'number') {
                val = val.props.children;
            } else if (Array.isArray(val.props.children)) {
                val = val.props.children.find(c => typeof c === 'string' || typeof c === 'number') || '—';
            } else if (val.props.children?.props?.children) {
                val = val.props.children.props.children;
            } else {
                val = '—';
            }
        }
        
        // ── Formatting ──
        if (col.includes('DATE') && val && val !== '—') {
            try { return new Date(val).toLocaleDateString(); } catch (e) { return val; }
        }
        if (typeof val === 'number' || (!isNaN(val) && val !== '—' && (col.includes('AMOUNT') || col.includes('TOTAL') || col.includes('BALANCE') || col.includes('PAY') || col.includes('FEE') || col.includes('COST')))) {
            return `LKR ${Number(val).toLocaleString()}`;
        }
        if (typeof val === 'object' && val !== null && val !== '—') {
            return val.number || val.name || val.id || '—';
        }
        
        return val !== undefined && val !== null ? String(val) : '—';
      });
    });

    autoTable(doc, {
      startY: 55,
      head: [filteredCols],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: THEME.primary, fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [250, 251, 253] },
      margin: { left: 15, right: 15, bottom: 20 },
      didDrawPage: (data) => {
        // Footer on every page
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`${settings.companyName} Management System`, 15, pageHeight - 10);
      }
    });

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  } catch (error) {
    console.error('Generic PDF error:', error);
    alert('Failed to generate PDF: ' + error.message);
  }
};
