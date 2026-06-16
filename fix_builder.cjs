const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/BookingBook.jsx', 'utf8');

const generateFunc = `  const [smsBuilder, setSmsBuilder] = useState({
    bookingFee: '',
    transport: '',
    otherCharges: '',
    discount: '',
    advancePaid: '',
    totalPrice: '',
    balanceDue: '',
    policies: 'Thank you for choosing RAXWO TOOL RENTALS!'
  });

  const getSmsString = (builder, record) => {
    if (!record) return '';
    const itemsList = Array.isArray(record.items) ? record.items : [];
    const toolNo = itemsList.map(it => it.toolNumber).join(' / ') || 'Tool';
    const accList = Array.isArray(record.accessories) ? record.accessories : [];
    const accStr = accList.map(a => \`\${a.name} (x\${a.quantity})\`).join(', ');

    const f = (val) => val ? \`LKR \${Number(val).toLocaleString()}\` : '-';

    return \`--- RAXWO BOOKING BILL ---
Customer: \${record.clientName || 'Customer'}
Phone: \${record.clientPhone || 'N/A'}
Date: \${new Date(record.pickupDate || new Date()).toLocaleDateString()} to \${new Date(record.returnDate || new Date()).toLocaleDateString()}

Items Booked:
\${toolNo}
\${accStr ? 'Accessories: ' + accStr : ''}

Booking Fee: \${f(builder.bookingFee)}
Transport: \${f(builder.transport)}
Other Charges: \${f(builder.otherCharges)}
Discount: \${f(builder.discount)}
--------------------
Total Price: \${f(builder.totalPrice)}
Paid: \${f(builder.advancePaid)}
Balance Due: \${f(builder.balanceDue)}

\${builder.policies}\`.trim();
  };

  const initSmsBuilder = (record) => {
    if (!record) return;
    const builder = {
      bookingFee: record.baseAmount || record.totalAmount || '',
      transport: record.transportCharge || '',
      otherCharges: record.extraCharges || '',
      discount: record.discount || '',
      totalPrice: record.totalAmount || '',
      advancePaid: record.advancePayment || '',
      balanceDue: record.balanceAmount || '',
      policies: 'Thank you for choosing RAXWO TOOL RENTALS!'
    };
    setSmsBuilder(builder);
    setCustomSmsText(getSmsString(builder, record));
  };`;

// Replace the old helper
const oldHelperRegex = /const generateDetailedBill = \(record\) => \{[\s\S]*?Thank you for choosing RAXWO TOOL RENTALS!`\.trim\(\);\s*\};/;
content = content.replace(oldHelperRegex, generateFunc);

content = content.replace(/setCustomSmsText\(generateDetailedBill\(firstBooking\)\);/g, 'initSmsBuilder(firstBooking);');
content = content.replace(/setCustomSmsText\(generateDetailedBill\(bookingData\)\);/g, 'initSmsBuilder(bookingData);');
content = content.replace(/setCustomSmsText\(generateDetailedBill\(record\)\);/g, 'initSmsBuilder(record);');

// Now I need to inject the SMS builder HTML into both the `smsModalOpen` and `autoInvoiceModalOpen` modals.
const builderHTML = `
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '15px' }}>
             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Booking Fee</label>
               <input type="number" placeholder="Booking Fee" value={smsBuilder.bookingFee} onChange={e => { const nb = {...smsBuilder, bookingFee: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Transport</label>
               <input type="number" placeholder="Transport" value={smsBuilder.transport} onChange={e => { const nb = {...smsBuilder, transport: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Other Charges</label>
               <input type="number" placeholder="Other Charges" value={smsBuilder.otherCharges} onChange={e => { const nb = {...smsBuilder, otherCharges: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Discount</label>
               <input type="number" placeholder="Discount" value={smsBuilder.discount} onChange={e => { const nb = {...smsBuilder, discount: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Total Price</label>
               <input type="number" placeholder="Total" value={smsBuilder.totalPrice} onChange={e => { const nb = {...smsBuilder, totalPrice: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Paid</label>
               <input type="number" placeholder="Paid" value={smsBuilder.advancePaid} onChange={e => { const nb = {...smsBuilder, advancePaid: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Balance</label>
               <input type="number" placeholder="Balance" value={smsBuilder.balanceDue} onChange={e => { const nb = {...smsBuilder, balanceDue: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
           </div>
           <div style={{ marginBottom: '15px' }}>
             <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Policies / Footer Note</label>
             <input type="text" value={smsBuilder.policies} onChange={e => { const nb = {...smsBuilder, policies: e.target.value}; setSmsBuilder(nb); setCustomSmsText(getSmsString(nb, smsRecord)); }} style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
           </div>
           `;

// Replace in normal SMS modal
// Find <div className="form-group"> <label>Custom Message (Optional)</label>
const modalTextareaOld = /<div className="form-group">\s*<label>Custom Message \(Optional\)<\/label>\s*<textarea[\s\S]*?<\/div>/;
const modalTextareaNew = `<div className="form-group">
            <label>Live SMS Preview</label>
            ` + builderHTML + `
            <textarea 
              rows={8} 
              value={customSmsText}
              onChange={e => setCustomSmsText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem', width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}
            />
          </div>`;
content = content.replace(modalTextareaOld, modalTextareaNew);

// Replace in auto Invoice Modal
const autoTextareaOld = /<div style=\{\{ display: 'flex', gap: '10px', alignItems: 'flex-start' \}\}>\s*<textarea[\s\S]*?<\/div>\s*<\/div>\s*<InvoiceForm/;
const autoTextareaNew = `<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             ` + builderHTML + `
             <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
               <textarea 
                 value={customSmsText} 
                 onChange={e => setCustomSmsText(e.target.value)}
                 rows={8} 
                 style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.85rem' }}
               />
               <button type="button" className="submit-btn" onClick={handleSmsSubmit} disabled={loading} style={{ whiteSpace: 'nowrap', padding: '0 20px', height: '42px', background: 'var(--accent)', color: '#fff' }}>
                  {loading ? 'Sending...' : 'Send SMS'}
               </button>
             </div>
           </div>
        </div>
        <InvoiceForm`;
content = content.replace(autoTextareaOld, autoTextareaNew);

fs.writeFileSync('frontend/src/components/BookingBook.jsx', content);
console.log('Fixed SMS Builder HTML');
