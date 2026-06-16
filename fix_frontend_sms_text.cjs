const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/BookingBook.jsx', 'utf8');

const helperFunc = `  const generateDetailedBill = (record) => {
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
    content = content.replace('const BookingBook = () => {', 'const BookingBook = () => {\n' + helperFunc);
}

// Replace creation success fallbacks
const bulkReplaceTarget = /setCustomSmsText\(firstBooking\.generatedSms \|\| \`Dear \$\{firstBooking\.clientName\}, your rental has been booked\. Thank you!\`\);/g;
content = content.replace(bulkReplaceTarget, 'setCustomSmsText(generateDetailedBill(firstBooking));');

const singleReplaceTarget = /setCustomSmsText\(bookingData\.generatedSms \|\| \`Dear \$\{bookingData\.clientName\}, your rental has been booked\. Thank you!\`\);/g;
content = content.replace(singleReplaceTarget, 'setCustomSmsText(generateDetailedBill(bookingData));');

// Replace handleNotify bulk
const notifyReplaceTarget = /const itemsList = Array\.isArray\(record\.items\) \? record\.items : \[\];[\s\S]*?setCustomSmsText\(detailedBill\);/;
content = content.replace(notifyReplaceTarget, 'setCustomSmsText(generateDetailedBill(record));');

fs.writeFileSync('frontend/src/components/BookingBook.jsx', content);
console.log('Fixed creation SMS generator on frontend');
