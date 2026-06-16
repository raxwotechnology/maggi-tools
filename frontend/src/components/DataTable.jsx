import React from 'react';
import './DataTable.css';

const DataTable = ({ columns, data, emptyMessage, loading, onRowClick }) => {
  return (
    <div className="table-wrapper">
      <div className="data-table-root">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="loading-cell">
                  <div className="shimmer-loader"></div>
                </td>
              </tr>
            ) : (data && data.length > 0) ? (
              data.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    onClick={() => onRowClick && onRowClick(row)}
                    className={onRowClick ? 'clickable-row' : ''}
                  >
                  {columns.map((col, colIndex) => {
                    // Field mapping logic
                    const fieldMap = {
                      'DATE': 'date',
                      'CLIENT NAME': 'name',
                      'CUSTOMER NAME': 'name_disp',
                      'CUSTOMER': 'clientName',
                      'TOOL': 'tool',
                      'TOOL NUMBER': 'toolNo',
                      'TOOL CATEGORY': 'toolCategory',
                      'LOCATION': 'location',
                      'CITY': 'city',
                      'ADDRESS': 'address',
                      'SITE': 'site',
                      'AMOUNT': 'amount',
                      'TOTAL COST': 'totalCost',
                      'EST. TOTAL': 'total_disp',
                      'NET PAY': 'netPay',
                      'PAID': 'takenAmount',
                      'ACTION': 'action',
                      'STATUS': 'status_disp',
                      'BILL#': 'billNumber',
                      'INVOICE#': 'invoiceNo',
                      'INV#': 'invoiceNo',
                      'QUOTE#': 'quotationNo',
                      'QUOTATION#': 'quotationNo',
                      'VALIDITY': 'validity_disp',
                      'EMPLOYEE': 'name',
                      'OPERATOR': 'operatorName',
                      'HELPER': 'helperName',
                      'CONTACT': 'contact_disp',
                      'ROLE': 'role',
                      'JOINED': 'joined',
                      'BASIC': 'basic',
                      'INCENTIVE': 'incentive',
                      'ADVANCE': 'advance',
                      'CONS. TYPE': 'consumableType',
                      'QUANTITY': 'quantity',
                      'PRICE/U': 'pricePerUnit',
                      'ODOMETER': 'odometer',
                      'NOTE': 'note',
                      'HIRE AMT':    'hireAmount',
                      'PAID AMT':    'paidAmount',
                      'BALANCE':     'balance',
                      'COMMISSION':  'commission',
                      'DAY PAY':     'dayPayment',
                      'TAKEN':       'takenAmount',
                      'START':       'startTime',
                      'END':         'endTime',
                      'REST':        'restTime',
                      'TOTAL HRS':   'totalHours',
                      'MIN HRS':     'minimumHours',
                      'HRS IN BILL': 'hoursInBill',
                      'TOTAL HOURS': 'totalHours',
                      'HOURS IN BILL':'hoursInBill',
                      'TOTAL HIRES': 'totalHires',
                      'TOTAL RENTALS': 'hires_disp',
                      'OUTSTANDING': 'outstanding_disp',
                      'PICKUP': 'pickupDate',
                      'RETURN': 'returnDate',
                      'NAME':        'name',
                      'NIC':         'nic',
                      'HOURS':       'workingHours',
                      'HOURLY':      'hourlyEarnings',
                      'DAILY':       'dailyAllowance',
                      'BILL AMT':    'billAmount',
                      'RENEWAL DATE': 'renewalDate',
                      'DUE DATE':     'date',
                      'FINAL DATE':   'finalDate',
                      'MONTHLY PREMIUM': 'amount',
                      'DAILY RATE': 'dailyRate_disp',
                      'CATEGORY': 'category',
                      'MODEL': 'model',
                      'TOOL ID / SERIAL': 'number'
                    };
                    
                    // Priority: Exact Column Key -> Explicit Map -> Lowercase Column Key
                    let keyToUse = col;
                    if (row[col] === undefined) {
                      keyToUse = fieldMap[col] || (row[col.toLowerCase()] !== undefined ? col.toLowerCase() : col);
                    }
                    let value = row[keyToUse];

                    // Smart Fallbacks for Client/Company fields
                    if ((col === 'CLIENT' || col === 'COMPANY') && (value === undefined || value === '—' || value === null)) {
                      value = row.clientName || row.client || row.name || '—';
                    }
                    // Smart Fallbacks for Status
                    if (col === 'STATUS' && (value === undefined || value === null)) {
                      value = row.status_disp || row.status || '—';
                    }
                    // Smart Fallbacks for Tool
                    if ((col === 'TOOL' || col === 'TOOL NUMBER' || col === 'VEHICLE' || col === 'TOOL ID / SERIAL')) {
                      if (value === undefined || value === null || value === '—') {
                        value = [row.tool, row.toolId, row.toolNo, row.vehicle, row.vehicleNo, row.number, row.vehicle_disp].find(v => v && v !== '—') || '—';
                        if (value && typeof value === 'object' && value.number) {
                          value = value.number;
                        }
                      }
                    }
                    if (col === 'LOCATION' && (value === undefined || value === '—' || value === null)) {
                      value = row.location || row.site || '—';
                    }
                    // Smart Fallbacks for Date
                    if (col === 'DATE' || col === 'DUE DATE') {
                      let rawDate = value;
                      if (rawDate === undefined || rawDate === null) {
                        rawDate = row.date_disp || row.date || row.renewalDate;
                      }
                      
                      if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}T/)) {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) {
                          value = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                        } else {
                          value = rawDate;
                        }
                      } else {
                        value = rawDate || '—';
                      }
                    }
                    if ((col === 'OPERATOR' || col === 'DRIVER' || col === 'EMPLOYEE') && (value === undefined || value === '—' || value === null)) {
                      value = row.operatorName || row.driverName || row.employee || row.name || '—';
                    }
                    if (col === 'DAILY RATE' && (value === undefined || value === null || value === '—')) {
                      const dr = row.dailyRate || row.rawData?.dailyRate;
                      value = dr ? `LKR ${Number(dr).toLocaleString()}` : '—';
                    }
                    
                    return (
                      <td key={colIndex} data-label={col}>
                        {value !== undefined && value !== null ? value : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  <div className="empty-content">
                    <div className="empty-icon">📂</div>
                    <p>{emptyMessage || 'No records found.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
