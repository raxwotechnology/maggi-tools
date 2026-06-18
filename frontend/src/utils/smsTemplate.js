export const DEFAULT_SMS_BOOKING_TEMPLATE = `--- {companyName} BOOKING BILL ---
Customer: {clientName}
Phone: {clientPhone}
NIC: {clientNic}
Pickup: {pickupLocation}
Return: {returnLocation}
Date: {pickupDate} to {returnDate}
{notesLine}
Items Booked:
{itemsBreakdown}
Transport: {transport}
Other Charges: {otherCharges}
Deposit: {deposit}
Discount: {discount}
--------------------
Total Price: {totalAmount}
Paid: {advancePayment}
Balance Due: {balanceAmount}
{billLink}
Contact Us: 0777778845

Thank you for choosing {companyName}!`;

export const DEFAULT_SMS_ADVANCE_TEMPLATE = `--- {companyName} ---
PAYMENT RECEIPT

Dear {clientName},

We confirm receipt of {amountReceived} via {paymentMethod}.

Invoice: {invoiceNo}
Total Bill: {totalAmount}
Total Paid: {advancePayment}
Balance Due: {balanceAmount}

{billLink}
Contact Us: 0777778845

Thank you for your payment!`;

export const SMS_PLACEHOLDER_GROUPS = [
  {
    title: 'Customer',
    keys: ['{clientName}', '{clientPhone}', '{clientNic}']
  },
  {
    title: 'Rental',
    keys: ['{pickupLocation}', '{returnLocation}', '{pickupDate}', '{returnDate}', '{notesLine}']
  },
  {
    title: 'Items',
    keys: ['{itemsBreakdown}', '{toolNo}', '{accessoriesLine}']
  },
  {
    title: 'Amounts',
    keys: ['{transport}', '{otherCharges}', '{deposit}', '{discount}', '{totalAmount}', '{advancePayment}', '{balanceAmount}', '{dailyRate}', '{overdueCharge}']
  },
  {
    title: 'Other',
    keys: ['{companyName}', '{billLink}', '{overdueDays}']
  },
  {
    title: 'Advance Payment',
    keys: ['{amountReceived}', '{paymentMethod}', '{invoiceNo}']
  }
];

const SAMPLE_BOOKING = {
  clientName: 'Sample Customer',
  clientPhone: '0771234567',
  clientNic: '200012345678',
  pickupLocation: 'Colombo',
  returnLocation: 'Colombo',
  pickupDate: new Date().toISOString(),
  returnDate: new Date(Date.now() + 2 * 86400000).toISOString(),
  notes: 'Sample booking',
  transportCharge: 1500,
  extraCharges: 0,
  securityDeposit: 5000,
  discount: 500,
  totalAmount: 12500,
  advancePayment: 5000,
  balanceAmount: 7500,
  totalDays: 2,
  _id: 'sample-booking-id',
  items: [
    { model: 'Drill Machine', toolNumber: 'TL-0001', dailyRate: 400, quantity: 1 },
    { model: 'Hammer Drill', toolNumber: 'TL-0002', dailyRate: 500, quantity: 1 }
  ],
  accessories: [{ name: 'Drill Bit', quantity: 2, price: 150 }]
};

function fmtMoney(v) {
  return v != null && v !== '' ? `LKR ${Number(v).toLocaleString()}` : '-';
}

function fmtOptionalMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `LKR ${n.toLocaleString()}`;
}

function normalizeSmsText(text) {
  return String(text || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return !/(^|\s)(Transport|Other Charges|Deposit|Discount|Accessories|Notes|View Bill):\s*$/i.test(trimmed);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getBookedItemName(item = {}) {
  return (
    item.model ||
    item.name ||
    item.toolName ||
    item.description ||
    ''
  );
}

function getTotalDays(bookingData = {}) {
  const explicit = Number(bookingData.totalDays);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const pickup = new Date(bookingData.pickupDate);
  const ret = new Date(bookingData.returnDate);
  if (!Number.isNaN(pickup.getTime()) && !Number.isNaN(ret.getTime())) {
    const diff = Math.floor((ret - pickup) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) return diff;
  }
  return 1;
}

function buildItemsBreakdown(bookingData = {}) {
  const itemsList = Array.isArray(bookingData.items) ? bookingData.items : [];
  const accList = Array.isArray(bookingData.accessories) ? bookingData.accessories : [];
  const days = getTotalDays(bookingData);
  const lines = [];

  itemsList.forEach((item) => {
    const name = getBookedItemName(item) || 'Item';
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.dailyRate) || 0;
    const lineTotal = rate * qty * days;
    const qtyLabel = qty > 1 ? ` (x${qty})` : '';
    lines.push(`• ${name}${qtyLabel}: ${fmtMoney(lineTotal)}`);
  });

  accList.forEach((acc) => {
    const name = acc.name || 'Accessory';
    const qty = Number(acc.quantity) || 1;
    const price = Number(acc.price) || 0;
    const lineTotal = price * qty;
    lines.push(`• ${name} (x${qty}): ${fmtMoney(lineTotal)}`);
  });

  if (lines.length === 0) return '• Rental';
  return lines.join('\n');
}

function buildSampleBillLink() {
  return 'View Bill: https://maggi-tool-rentals.netlify.app/bill/sample-token';
}

function migrateBookingTemplate(template) {
  let t = String(template || '').trim();
  if (!t) return DEFAULT_SMS_BOOKING_TEMPLATE;

  if (!t.includes('{itemsBreakdown}')) {
    t = t
      .replace(/\{toolNo\}\s*\n?\{accessoriesLine\}/g, '{itemsBreakdown}')
      .replace(/\{toolNo\}/g, '{itemsBreakdown}')
      .replace(/\{accessoriesLine\}\s*\n?/g, '');
  }

  if (!t.includes('{billLink}')) {
    t = `${t}\n{billLink}`;
  }

  return t;
}

export function isLegacyShortTemplate(template) {
  if (!template || typeof template !== 'string') return true;
  const t = template.trim();
  if (!t) return true;
  if (t.includes('BOOKING BILL') || t.includes('{transport}')) return false;
  return t.length < 120 && t.includes('Dear {clientName}');
}

export function resolveBookingTemplate(stored, companyName = 'MAGGI TOOL RENTALS') {
  if (isLegacyShortTemplate(stored)) {
    return DEFAULT_SMS_BOOKING_TEMPLATE.replace(/\{companyName\}/g, companyName);
  }
  return migrateBookingTemplate(stored).replace(/\{companyName\}/g, companyName);
}

export function previewSmsTemplate(template, companyName = 'MAGGI TOOL RENTALS') {
  const booking = { ...SAMPLE_BOOKING };
  const itemsList = booking.items || [];
  const accList = booking.accessories || [];
  const itemsBreakdown = buildItemsBreakdown(booking);
  const toolNo = itemsList.map((it) => getBookedItemName(it)).filter(Boolean).join(' / ');
  const accStr = accList.map((a) => `${a.name} (x${a.quantity})`).join(', ');
  const billLink = buildSampleBillLink();

  const replacements = {
    '{clientName}': booking.clientName,
    '{clientPhone}': booking.clientPhone,
    '{clientNic}': booking.clientNic,
    '{pickupLocation}': booking.pickupLocation,
    '{returnLocation}': booking.returnLocation,
    '{pickupDate}': new Date(booking.pickupDate).toLocaleDateString(),
    '{returnDate}': new Date(booking.returnDate).toLocaleDateString(),
    '{toolNo}': itemsBreakdown,
    '{itemsBreakdown}': itemsBreakdown,
    '{accessoriesLine}': '',
    '{notesLine}': booking.notes ? `Notes: ${booking.notes}` : '',
    '{transport}': fmtOptionalMoney(booking.transportCharge),
    '{otherCharges}': fmtOptionalMoney(booking.extraCharges),
    '{deposit}': fmtOptionalMoney(booking.securityDeposit),
    '{discount}': fmtOptionalMoney(booking.discount),
    '{totalAmount}': fmtMoney(booking.totalAmount),
    '{advancePayment}': fmtMoney(booking.advancePayment),
    '{balanceAmount}': fmtMoney(booking.balanceAmount),
    '{companyName}': companyName,
    '{billLink}': billLink
  };

  let result = template || '';
  Object.entries(replacements).forEach(([key, val]) => {
    result = result.split(key).join(val);
  });

  let finalText = normalizeSmsText(result);
  finalText = finalText.replace(/raxwo\s+tools?\s+rentals?/gi, companyName);
  if (!finalText.includes('0777778845')) {
    finalText = `${finalText}\nContact Us: 0777778845`;
  }
  if (!finalText.includes('View Bill:')) {
    finalText = `${finalText}\n${billLink}`;
  }
  return finalText;
}

export function previewAdvanceSmsTemplate(template, settings = {}) {
  const companyName = 'MAGGI TOOL RENTALS';
  const billLink = 'View Bill: https://maggi-tools.netlify.app/bill/sample-token';
  let result = (template && template.trim()) ? template.trim() : DEFAULT_SMS_ADVANCE_TEMPLATE;
  const replacements = {
    '{clientName}': 'Sample Customer',
    '{companyName}': companyName,
    '{amountReceived}': 'LKR 5,000',
    '{paymentMethod}': 'Cash',
    '{invoiceNo}': 'INV-25-0001',
    '{totalAmount}': 'LKR 12,500',
    '{advancePayment}': 'LKR 5,000',
    '{balanceAmount}': 'LKR 7,500',
    '{billLink}': billLink
  };
  Object.entries(replacements).forEach(([key, val]) => {
    result = result.split(key).join(val);
  });
  return normalizeSmsText(result);
}
