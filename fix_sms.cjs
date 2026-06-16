const fs = require('fs');

// 1. Modify Backend
const backendPath = 'backend/routes/bookings.js';
let bContent = fs.readFileSync(backendPath, 'utf8');

// Stop auto-sending SMS in side effects
const targetSms = /if \(newBooking\.clientPhone\) \{\s*const msg = await buildSMSMessage\('smsBookingTemplate', newBooking\);\s*if \(msg\) \{\s*await sendSMS\(newBooking\.clientPhone, msg\);\s*\}\s*\}/;
bContent = bContent.replace(targetSms, `
      if (newBooking.clientPhone) {
        // Just build it, do not send it automatically! The frontend will handle sending.
        newBooking.generatedSms = await buildSMSMessage('smsBookingTemplate', newBooking);
      }
`);

fs.writeFileSync(backendPath, bContent);
console.log('Fixed backend auto SMS');

// 2. Modify Frontend
const frontendPath = 'frontend/src/components/BookingBook.jsx';
let fContent = fs.readFileSync(frontendPath, 'utf8');

// Modify the success message logic to capture generatedSms
fContent = fContent.replace(/setSuccess\('Booking recorded! Generating automated bill & sending SMS...'\);\s*setAutoInvoice\(bookingData\.invoiceDetails\);\s*setAutoInvoiceModalOpen\(true\);/, `
        setSuccess('Booking recorded successfully.');
        setAutoInvoice(bookingData.invoiceDetails);
        setSmsRecord(bookingData);
        setCustomSmsText(bookingData.generatedSms || \`Dear \${bookingData.clientName}, your rental has been booked. Thank you!\`);
        setAutoInvoiceModalOpen(true);
`);

fContent = fContent.replace(/setSuccess\(\`\$\{formData\.length\} tools booked successfully\.\`\);/, `
        setSuccess(\`\${formData.length} tools booked successfully.\`);
        const firstBooking = res.data.bookings ? res.data.bookings[0] : res.data[0];
        if (firstBooking) {
            setAutoInvoice(firstBooking.invoiceDetails);
            setSmsRecord(firstBooking);
            setCustomSmsText(firstBooking.generatedSms || \`Dear \${firstBooking.clientName}, your rental has been booked. Thank you!\`);
            setAutoInvoiceModalOpen(true);
        }
`);

// Modify the AutoInvoiceModal HTML
const oldModalTarget = /<div style=\{\{ marginBottom: '15px', background: 'var\(--success-soft\)', color: 'var\(--success\)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 \}\}>\s*<CheckCircle size=\{18\} \/> Booking successful! An automated SMS has been sent to the customer\. You can now edit and print the final bill\.\s*<\/div>/;

const newModalTarget = `
        <div style={{ marginBottom: '15px', background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <CheckCircle size={18} /> Booking successful! Review and send the SMS to the customer below.
        </div>
        
        <div className="hire-form" style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px' }}>
           <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Send SMS Notification</h4>
           <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
             <textarea 
               value={customSmsText} 
               onChange={e => setCustomSmsText(e.target.value)}
               rows={3} 
               style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}
             />
             <button type="button" className="submit-btn" onClick={handleSmsSubmit} disabled={loading} style={{ whiteSpace: 'nowrap', padding: '0 20px', height: '42px', background: 'var(--accent)', color: '#fff' }}>
                {loading ? 'Sending...' : 'Send SMS'}
             </button>
           </div>
        </div>
`;

fContent = fContent.replace(oldModalTarget, newModalTarget);

fs.writeFileSync(frontendPath, fContent);
console.log('Fixed frontend modal SMS');
