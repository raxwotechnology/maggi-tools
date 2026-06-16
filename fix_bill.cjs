const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/BookingBook.jsx', 'utf8');

const targetHelper = /const generateDetailedBill = \(record\) => \{[\s\S]*?Thank you for choosing RAXWO TOOL RENTALS!'\.trim\(\);\s*\};/;

const newHelper = `const generateDetailedBill = (record) => {
    if (!record) return '';
    const itemsList = Array.isArray(record.items) ? record.items : [];
    const toolNo = itemsList.map(it => it.toolNumber).join(' / ') || 'Tool';
    const accList = Array.isArray(record.accessories) ? record.accessories : [];
    const accStr = accList.map(a => \`\${a.name} (x\${a.quantity})\`).join(', ');

    const formatMoney = (val) => (val && val > 0) ? \`LKR \${val.toLocaleString()}\` : '-';

    return \`--- RAXWO BOOKING BILL ---
Customer: \${record.clientName || 'Customer'}
Phone: \${record.clientPhone || 'N/A'}
Date: \${new Date(record.pickupDate || new Date()).toLocaleDateString()} to \${new Date(record.returnDate || new Date()).toLocaleDateString()}

Items Booked:
\${toolNo}
\${accStr ? 'Accessories: ' + accStr : ''}

Booking Fee: \${formatMoney(record.baseAmount || record.totalAmount)}
Transport: \${formatMoney(record.transportCharge)}
Other Charges: \${formatMoney(record.extraCharges)}
Discount: \${formatMoney(record.discount)}
--------------------
Total: \${formatMoney(record.totalAmount)}
Paid: \${formatMoney(record.advancePayment)}
Balance Due: \${formatMoney(record.balanceAmount)}

Thank you for choosing RAXWO TOOL RENTALS!\`.trim();
  };`;

content = content.replace(targetHelper, newHelper);
fs.writeFileSync('frontend/src/components/BookingBook.jsx', content);
console.log('Fixed helper');
