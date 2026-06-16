const fs = require('fs');
let content = fs.readFileSync('backend/routes/bookings.js', 'utf8');

const targetHelper = /const detailedBill = `[\s\S]*?Thank you for choosing \$\{settings\?\.companyName \|\| 'RAXWO TOOL RENTALS'\}!`\.trim\(\);/;

const newHelper = `const formatMoney = (val) => (val && val > 0) ? \`LKR \${val.toLocaleString()}\` : '-';

    const detailedBill = \`--- RAXWO BOOKING BILL ---
Customer: \${bookingData.clientName || 'Customer'}
Phone: \${bookingData.clientPhone || 'N/A'}
Date: \${new Date(bookingData.pickupDate || new Date()).toLocaleDateString()} to \${new Date(bookingData.returnDate || new Date()).toLocaleDateString()}

Items Booked:
\${toolNo}
\${accStr ? 'Accessories: ' + accStr : ''}

Booking Fee: \${formatMoney(bookingData.baseAmount || bookingData.totalAmount)}
Transport: \${formatMoney(bookingData.transportCharge)}
Other Charges: \${formatMoney(bookingData.extraCharges)}
Discount: \${formatMoney(bookingData.discount)}
--------------------
Total Price: \${formatMoney(bookingData.totalAmount)}
Advance Paid: \${formatMoney(bookingData.advancePayment)}
Balance Due: \${formatMoney(bookingData.balanceAmount)}

Thank you for choosing \${settings?.companyName || 'RAXWO TOOL RENTALS'}!\`.trim();`;

content = content.replace(targetHelper, newHelper);
fs.writeFileSync('backend/routes/bookings.js', content);
console.log('Fixed backend buildSMSMessage helper');
