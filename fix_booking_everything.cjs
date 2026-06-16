const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/BookingBook.jsx', 'utf8');

// 1. Remove onRowClick
content = content.replace(/onRowClick=\{\(record\) => \{ setSelectedRecord\(record\.rawData \|\| record\); setViewModalOpen\(true\); \}\}/, '');

// 2. Add Eye to imports
if (!content.includes('Eye,')) {
    content = content.replace('Download, Search', 'Download, Eye, Search');
}

// 3. Remove Confirmed and Cancelled options
content = content.replace('<option value="Confirmed">Confirmed</option>', '');
content = content.replace('<option value="Cancelled">Cancelled</option>', '');

// 4. Inject Eye into ACTION
const actionTarget = `ACTION: (
              <div className="table-actions" onClick={e => e.stopPropagation()}>
                {canManage && (`;
const actionReplace = `ACTION: (
              <div className="table-actions" onClick={e => e.stopPropagation()}>
                <button className="action-icon-btn btn-details" onClick={(e) => { e.stopPropagation(); setSelectedRecord(r.rawData || r); setViewModalOpen(true); }} title="View Details">
                  <Eye />
                </button>
                {canManage && (`;
if (!content.includes('<Eye />')) {
    content = content.replace(actionTarget, actionReplace);
}

// 5. Inject generateDetailedBill
const helper = `  const generateDetailedBill = (record) => {
    if (!record) return '';
    const itemsList = Array.isArray(record.items) ? record.items : [];
    const toolNo = itemsList.map(it => it.toolNumber).join(' / ') || 'Tool';
    const accList = Array.isArray(record.accessories) ? record.accessories : [];
    const accStr = accList.map(a => \`\${a.name} (x\${a.quantity})\`).join(', ');

    return \`--- RAXWO BOOKING BILL ---
Customer: \${record.clientName || 'Customer'}
Phone: \${record.clientPhone || 'N/A'}
Date: \${new Date(record.pickupDate || new Date()).toLocaleDateString()} to \${new Date(record.returnDate || new Date()).toLocaleDateString()}

Items Booked:
\${toolNo}
\${accStr ? 'Accessories: ' + accStr : ''}

Total Price: LKR \${(record.totalAmount || 0).toLocaleString()}
Advance Paid: LKR \${(record.advancePayment || 0).toLocaleString()}
Balance Due: LKR \${(record.balanceAmount || 0).toLocaleString()}

Thank you for choosing RAXWO TOOL RENTALS!\`.trim();
  };`;

if (!content.includes('const generateDetailedBill = (record) => {')) {
    content = content.replace('const BookingBook = () => {', 'const BookingBook = () => {\n' + helper);
}

// 6. Fix handleNotify
const notifyTarget = /const handleNotify = async \(e, record\) => \{[\s\S]*?setSmsModalOpen\(true\);\s*\};/;
const notifyReplace = `const handleNotify = async (e, record) => {
    e.stopPropagation();
    if (!record.clientPhone) return alert('No phone number found for this customer.');
    setSmsRecord(record);
    setCustomSmsText(generateDetailedBill(record));
    setSmsModalOpen(true);
  };`;
content = content.replace(notifyTarget, notifyReplace);

// 7. Fix handleFormSubmit single & bulk
const singleFormSubmitTarget = /setSuccess\('Booking recorded! Generating automated bill & sending SMS\.\.\.'\);\s*setAutoInvoice\(bookingData\.invoiceDetails\);\s*setAutoInvoiceModalOpen\(true\);/;
content = content.replace(singleFormSubmitTarget, 
  `setSuccess('Booking recorded successfully.');
        setAutoInvoice(bookingData.invoiceDetails);
        setSmsRecord(bookingData);
        setCustomSmsText(generateDetailedBill(bookingData));
        setAutoInvoiceModalOpen(true);`);

const bulkFormSubmitTarget = /setSuccess\(`\$\{formData\.length\} tools booked successfully\.`\);/;
content = content.replace(bulkFormSubmitTarget,
  `setSuccess(\`\${formData.length} tools booked successfully.\`);
        const firstBooking = res.data.bookings ? res.data.bookings[0] : res.data[0];
        if (firstBooking) {
            setAutoInvoice(firstBooking.invoiceDetails);
            setSmsRecord(firstBooking);
            setCustomSmsText(generateDetailedBill(firstBooking));
            setAutoInvoiceModalOpen(true);
        }`);

// 8. Fix AutoInvoiceModal HTML
const oldModalHTML = /<div style=\{\{ marginBottom: '15px', background: 'var\(--success-soft\)', color: 'var\(--success\)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 \}\}>\s*<CheckCircle size=\{18\} \/> Booking successful! An automated SMS has been sent to the customer\. You can now edit and print the final bill\.\s*<\/div>/;

const newModalHTML = `<div style={{ marginBottom: '15px', background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <CheckCircle size={18} /> Booking successful! Review and send the SMS to the customer below.
        </div>
        
        <div className="hire-form" style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px' }}>
           <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Send SMS Notification</h4>
           <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
             <textarea 
               value={customSmsText} 
               onChange={e => setCustomSmsText(e.target.value)}
               rows={7} 
               style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.85rem' }}
             />
             <button type="button" className="submit-btn" onClick={handleSmsSubmit} disabled={loading} style={{ whiteSpace: 'nowrap', padding: '0 20px', height: '42px', background: 'var(--accent)', color: '#fff' }}>
                {loading ? 'Sending...' : 'Send SMS'}
             </button>
           </div>
        </div>`;
content = content.replace(oldModalHTML, newModalHTML);

fs.writeFileSync('frontend/src/components/BookingBook.jsx', content);
console.log('Successfully re-patched BookingBook.jsx');
