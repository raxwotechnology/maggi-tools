const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/BookingBook.jsx', 'utf8');

const oldNotify = /const handleNotify = async \(e, record\) => \{[\s\S]*?setSmsModalOpen\(true\);\s*\};/;

const newNotify = `const handleNotify = async (e, record) => {
    e.stopPropagation();
    if (!record.clientPhone) return alert('No phone number found for this customer.');
    setSmsRecord(record);
    
    // Generate detailed bill for SMS box
    const itemsList = Array.isArray(record.items) ? record.items : [];
    const toolNo = itemsList.map(it => it.toolNumber).join(' / ') || 'Tool';
    const accList = Array.isArray(record.accessories) ? record.accessories : [];
    const accStr = accList.map(a => \`\${a.name} (x\${a.quantity})\`).join(', ');

    const detailedBill = \`--- RAXWO BOOKING BILL ---
Customer: \${record.clientName || 'Customer'}
Phone: \${record.clientPhone || 'N/A'}
Date: \${new Date(record.pickupDate).toLocaleDateString()} to \${new Date(record.returnDate).toLocaleDateString()}

Items Booked:
\${toolNo}
\${accStr ? 'Accessories: ' + accStr : ''}

Total Price: LKR \${(record.totalAmount || 0).toLocaleString()}
Advance Paid: LKR \${(record.advancePayment || 0).toLocaleString()}
Balance Due: LKR \${(record.balanceAmount || 0).toLocaleString()}

Thank you for choosing RAXWO TOOL RENTALS!\`.trim();

    setCustomSmsText(detailedBill);
    setSmsModalOpen(true);
  };`;

content = content.replace(oldNotify, newNotify);
fs.writeFileSync('frontend/src/components/BookingBook.jsx', content);
console.log('Fixed handleNotify to pre-fill detailed bill');
