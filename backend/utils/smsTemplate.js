const { generateBillViewUrl } = require('./billLink');

const DEFAULT_SMS_BOOKING_TEMPLATE = `--- {companyName} BOOKING BILL ---
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

const DEFAULT_SMS_ADVANCE_TEMPLATE = `--- {companyName} ---
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

const SMS_PLACEHOLDERS = [
  '{clientName}', '{clientPhone}', '{clientNic}',
  '{pickupLocation}', '{returnLocation}', '{pickupDate}', '{returnDate}',
  '{toolNo}', '{itemsBreakdown}', '{accessoriesLine}', '{notesLine}',
  '{transport}', '{otherCharges}', '{deposit}', '{discount}',
  '{totalAmount}', '{advancePayment}', '{balanceAmount}', '{companyName}',
  '{billLink}', '{detailedBill}', '{dailyRate}', '{overdueDays}', '{overdueCharge}'
];

function fmtMoney(v) {
  return v != null && v !== '' ? `LKR ${Number(v).toLocaleString()}` : '-';
}

function fmtOptionalMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `LKR ${n.toLocaleString()}`;
}

function getCompanyName(settings) {
  return 'MAGGI TOOLS';
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
  const bookedDays = getTotalDays(bookingData);
  const pickupDateObj = new Date(bookingData.pickupDate);
  pickupDateObj.setHours(0, 0, 0, 0);

  const lines = [];

  itemsList.forEach((item) => {
    const name = getBookedItemName(item) || 'Item';
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.dailyRate) || 0;
    
    let days = bookedDays;
    if (item.returnDates && item.returnDates.length > 0) {
       const retDate = new Date(item.returnDates[item.returnDates.length - 1].date);
       retDate.setHours(0, 0, 0, 0);
       let rentedDays = Math.round((retDate - pickupDateObj) / (1000 * 60 * 60 * 24));
       if (rentedDays <= 0) rentedDays = 0; else rentedDays += 1;
       days = rentedDays || 1;
    }

    const lineTotal = rate * qty * days;
    const qtyLabel = qty > 1 ? ` (x${qty})` : '';
    lines.push(`• ${name}${qtyLabel} for ${days} days: ${fmtMoney(lineTotal)}`);
  });

  accList.forEach((acc) => {
    const name = acc.name || 'Accessory';
    const qty = Number(acc.quantity) || 1;
    const price = Number(acc.price) || 0;
    
    let days = bookedDays;
    if (acc.returnDates && acc.returnDates.length > 0) {
       const retDate = new Date(acc.returnDates[acc.returnDates.length - 1].date);
       retDate.setHours(0, 0, 0, 0);
       let rentedDays = Math.round((retDate - pickupDateObj) / (1000 * 60 * 60 * 24));
       if (rentedDays <= 0) rentedDays = 0; else rentedDays += 1;
       days = rentedDays || 1;
    }

    const lineTotal = price * qty * days;
    lines.push(`• ${name} (x${qty}) for ${days} days: ${fmtMoney(lineTotal)}`);
  });

  if (lines.length === 0) return '• Rental';
  return lines.join('\n');
}

function buildBillLinkLine(bookingData = {}) {
  const bookingId = bookingData._id || bookingData.id;
  if (!bookingId) return '';
  const url = generateBillViewUrl(bookingId);
  return url ? `View Bill: ${url}` : '';
}

function isLegacyShortTemplate(template) {
  if (!template || typeof template !== 'string') return true;
  const t = template.trim();
  if (!t) return true;
  if (t.includes('BOOKING BILL') || t.includes('{transport}')) return false;
  return t.length < 120 && t.includes('Dear {clientName}');
}

function buildDetailedBillMessage(bookingData, settings) {
  return applySmsTemplate(
    DEFAULT_SMS_BOOKING_TEMPLATE,
    bookingData,
    settings
  );
}

function applySmsTemplate(template, bookingData, settings, precomputed = {}) {
  const itemsList = Array.isArray(bookingData.items) ? bookingData.items : [];
  const accList = Array.isArray(bookingData.accessories) ? bookingData.accessories : [];
  const itemsBreakdown = precomputed.itemsBreakdown ?? buildItemsBreakdown(bookingData);
  const billLinkLine = precomputed.billLinkLine ?? buildBillLinkLine(bookingData);
  const toolNo =
    precomputed.toolNo ??
    (itemsList.map((it) => `${getBookedItemName(it)} for ${getTotalDays(bookingData)} days`).filter(Boolean).join(' / ') ||
      accList.map((a) => `${a.name} for ${getTotalDays(bookingData)} days`).filter(Boolean).join(' / ') ||
      'Rental');
  const accStr =
    precomputed.accStr ??
    accList.map((a) => `${a.name} (x${a.quantity})`).join(', ');

  const companyName = getCompanyName(settings);
  const pickupDate = bookingData.pickupDate
    ? new Date(bookingData.pickupDate).toLocaleDateString()
    : '-';
  const returnDate = bookingData.returnDate
    ? new Date(bookingData.returnDate).toLocaleDateString()
    : '-';

  const replacements = {
    '{clientName}': bookingData.clientName || 'Customer',
    '{clientPhone}': bookingData.clientPhone || 'N/A',
    '{clientNic}': bookingData.clientNic || 'N/A',
    '{pickupLocation}': bookingData.pickupLocation || 'N/A',
    '{returnLocation}': bookingData.returnLocation || 'N/A',
    '{pickupDate}': pickupDate,
    '{returnDate}': returnDate,
    '{toolNo}': itemsBreakdown,
    '{itemsBreakdown}': itemsBreakdown,
    '{accessoriesLine}': '',
    '{notesLine}': bookingData.notes ? `Notes: ${bookingData.notes}` : '',
    '{transport}': fmtOptionalMoney(bookingData.transportCharge),
    '{otherCharges}': fmtOptionalMoney(bookingData.extraCharges),
    '{deposit}': fmtOptionalMoney(bookingData.securityDeposit ?? bookingData.deposit),
    '{discount}': fmtOptionalMoney(bookingData.discount),
    '{totalAmount}': fmtMoney(bookingData.totalAmount),
    '{advancePayment}': fmtMoney(bookingData.advancePayment),
    '{balanceAmount}': fmtMoney(bookingData.balanceAmount),
    '{companyName}': companyName,
    '{billLink}': billLinkLine
  };

  let result = template;
  if (!result.includes('{detailedBill}') && !result.includes('{balanceAmount}') && !result.includes('BOOKING BILL')) {
    result = `${result}\n\n{detailedBill}`;
  }

  Object.entries(replacements).forEach(([key, val]) => {
    result = result.split(key).join(val);
  });

  if (result.includes('{detailedBill}')) {
    const bill = buildDetailedBillMessage(bookingData, settings);
    result = result.replace(/\{detailedBill\}/g, bill);
  }

  if (billLinkLine && !result.includes('View Bill:')) {
    result = `${result}\n${billLinkLine}`;
  }

  let finalText = normalizeSmsText(result.replace(/LKR\s+LKR/gi, 'LKR'));
  finalText = finalText.replace(/raxwo\s+tools?\s+rentals?/gi, companyName);
  if (!finalText.includes('0777778845')) {
    finalText = `${finalText}\nContact Us: 0777778845`;
  }
  return finalText;
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

function resolveBookingTemplate(settings) {
  const raw = settings?.smsBookingTemplate;
  if (isLegacyShortTemplate(raw)) {
    return DEFAULT_SMS_BOOKING_TEMPLATE;
  }
  return migrateBookingTemplate(raw);
}

function resolveAdvanceTemplate(settings) {
  const raw = settings?.smsAdvanceTemplate;
  if (raw && String(raw).trim()) return String(raw).trim();
  return DEFAULT_SMS_ADVANCE_TEMPLATE;
}

function buildAdvancePaymentSms(bookingData, settings, options = {}) {
  const amountReceived = Number(options.amountReceived) || 0;
  const paymentMethod = options.paymentMethod || bookingData.paymentMethod || 'Cash';
  const companyName = getCompanyName(settings);
  const billLinkLine = buildBillLinkLine(bookingData);
  const totalPaid = Number(bookingData.advancePayment) || 0;
  const totalAmount = Number(bookingData.totalAmount) || 0;
  const balance = Number(bookingData.balanceAmount) ?? Math.max(0, totalAmount - totalPaid);

  const template = resolveAdvanceTemplate(settings);
  const replacements = {
    '{clientName}': bookingData.clientName || 'Customer',
    '{companyName}': companyName,
    '{amountReceived}': fmtMoney(amountReceived),
    '{paymentMethod}': paymentMethod,
    '{invoiceNo}': bookingData.invoiceNo || bookingData.bookingId || '—',
    '{totalAmount}': fmtMoney(totalAmount),
    '{advancePayment}': fmtMoney(totalPaid),
    '{balanceAmount}': fmtMoney(balance),
    '{billLink}': billLinkLine
  };

  let result = template;
  Object.entries(replacements).forEach(([key, val]) => {
    result = result.split(key).join(val);
  });

  let finalText = normalizeSmsText(result.replace(/LKR\s+LKR/gi, 'LKR'));
  finalText = finalText.replace(/raxwo\s+tools?\s+rentals?/gi, companyName);
  if (billLinkLine && !finalText.includes('View Bill:')) {
    finalText = `${finalText}\n${billLinkLine}`;
  }
  if (!finalText.includes('0777778845')) {
    finalText = `${finalText}\nContact Us: 0777778845`;
  }
  return finalText;
}

module.exports = {
  DEFAULT_SMS_BOOKING_TEMPLATE,
  DEFAULT_SMS_ADVANCE_TEMPLATE,
  SMS_PLACEHOLDERS,
  isLegacyShortTemplate,
  buildDetailedBillMessage,
  buildAdvancePaymentSms,
  buildItemsBreakdown,
  buildBillLinkLine,
  getCompanyName,
  applySmsTemplate,
  resolveBookingTemplate,
  resolveAdvanceTemplate,
  fmtMoney
};
