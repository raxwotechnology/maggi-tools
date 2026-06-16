const { fmtMoney, getCompanyName } = require('./smsTemplate');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2p(value) {
  return String(value ?? '').split('\n').filter(Boolean)
    .map(line => `<p style="margin:2px 0">${escapeHtml(line)}</p>`).join('');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcDays(pickupDate, returnDateStr) {
  if (!pickupDate || !returnDateStr) return 0;
  const p = new Date(pickupDate); p.setHours(0, 0, 0, 0);
  const r = new Date(returnDateStr); r.setHours(0, 0, 0, 0);
  const diff = Math.round((r - p) / 86400000);
  return diff <= 0 ? 0 : diff + 1;
}

function renderBillViewHtml(booking, invoice, settings) {
  const companyName = getCompanyName(settings);
  const phones = (settings?.phones || []).filter(Boolean);
  const contactDisplay = phones.join(' / ') || settings?.email || '';
  const privacyPolicy = settings?.privacyPolicy || '';
  const termsConditions = settings?.termsConditions || '';

  const pickupDate = booking.pickupDate;
  const totalBookingDays = booking.totalDays || calcDays(pickupDate, booking.returnDate) || 1;
  const items = booking.items || [];
  const accs = booking.accessories || [];

  // Build item rows
  const itemRows = items.map(it => {
    const qty = Number(it.quantity) || 1;
    const rate = Number(it.dailyRate) || 0;
    const returnDateStr = it.returnDates?.length > 0
      ? it.returnDates[it.returnDates.length - 1].date
      : booking.returnDate;
    const days = calcDays(pickupDate, returnDateStr) || totalBookingDays;
    return {
      name: `${it.toolNumber || ''} — ${it.model || 'Tool'}`,
      type: 'Tool', qty, rate, days,
      amount: rate * qty * days
    };
  });

  const accRows = accs.map(ac => {
    const qty = Number(ac.quantity) || 1;
    const rate = Number(ac.price) || 0;
    const returnDateStr = ac.returnDates?.length > 0
      ? ac.returnDates[ac.returnDates.length - 1].date
      : booking.returnDate;
    const days = calcDays(pickupDate, returnDateStr) || totalBookingDays;
    return {
      name: ac.name || 'Accessory',
      type: 'Accessory', qty, rate, days,
      amount: rate * qty * days
    };
  });

  const allRows = [...itemRows, ...accRows];

  const transport = Number(booking.transportCharge) || 0;
  const otherCharges = Number(booking.extraCharges) || 0;
  const deposit = Number(booking.securityDeposit ?? booking.deposit) || 0;
  const discount = Number(booking.discount) || 0;
  const totalAmount = Number(booking.totalAmount) || 0;
  const advancePaid = Number(booking.advancePayment) || 0;
  const balance = Number(booking.balanceAmount) || Math.max(0, totalAmount - advancePaid);
  const isPaid = balance <= 0;
  const paymentMethod = booking.paymentMethod || '';

  const tableRows = allRows.map((row, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td style="padding:12px 10px;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:600;color:#1e293b;">${escapeHtml(row.name)}</div>
        <div style="font-size:0.72rem;color:#94a3b8;">${escapeHtml(row.type)}</div>
      </td>
      <td style="padding:12px 10px;text-align:center;border-bottom:1px solid #f1f5f9;">${row.qty}</td>
      <td style="padding:12px 10px;text-align:center;border-bottom:1px solid #f1f5f9;">
        <span style="background:#ede9fe;color:#7c3aed;border-radius:6px;padding:2px 8px;font-size:0.78rem;font-weight:700;">${row.days}d</span>
      </td>
      <td style="padding:12px 10px;text-align:right;border-bottom:1px solid #f1f5f9;color:#64748b;">${fmtMoney(row.rate)}</td>
      <td style="padding:12px 10px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;">${fmtMoney(row.amount)}</td>
    </tr>`).join('');

  const extraChargesHtml = (transport > 0 || otherCharges > 0 || deposit > 0 || discount > 0) ? `
    <div style="background:#f8fafc;border-radius:10px;padding:12px 16px;margin-bottom:14px;border:1px solid #e2e8f0;">
      ${transport > 0 ? `<div style="display:flex;justify-content:space-between;font-size:0.88rem;color:#64748b;padding:4px 0"><span>Transport</span><span>${fmtMoney(transport)}</span></div>` : ''}
      ${otherCharges > 0 ? `<div style="display:flex;justify-content:space-between;font-size:0.88rem;color:#64748b;padding:4px 0"><span>Other Charges</span><span>${fmtMoney(otherCharges)}</span></div>` : ''}
      ${deposit > 0 ? `<div style="display:flex;justify-content:space-between;font-size:0.88rem;color:#64748b;padding:4px 0"><span>Security Deposit</span><span>${fmtMoney(deposit)}</span></div>` : ''}
      ${discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:0.88rem;color:#059669;padding:4px 0"><span>Discount</span><span>− ${fmtMoney(discount)}</span></div>` : ''}
    </div>` : '';

  const legalHtml = (termsConditions || privacyPolicy) ? `
    <div style="padding:0 0 20px;">
      ${termsConditions ? `
        <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;border:1px solid #e2e8f0;margin-bottom:10px;">
          <div style="font-size:0.7rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">📋 Terms &amp; Conditions</div>
          <div style="font-size:0.75rem;color:#64748b;line-height:1.65;">${nl2p(termsConditions)}</div>
        </div>` : ''}
      ${privacyPolicy ? `
        <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;border:1px solid #e2e8f0;">
          <div style="font-size:0.7rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">🔒 Privacy Policy</div>
          <div style="font-size:0.75rem;color:#64748b;line-height:1.65;">${nl2p(privacyPolicy)}</div>
        </div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(companyName)} — Rental Bill</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#667eea22 0%,#764ba222 50%,#4f46e511 100%),#f1f5f9;padding:24px 12px 48px;min-height:100vh;}
    @media(max-width:600px){body{padding:12px 8px 32px}.card{border-radius:14px}td,th{padding:8px 6px!important;font-size:0.82rem!important}}
  </style>
</head>
<body>
  <div class="card" style="max-width:640px;margin:0 auto;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);overflow:hidden;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 24px 22px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:1.45rem;font-weight:900;color:#fff;letter-spacing:-0.5px;">${escapeHtml(companyName)}</div>
        <div style="font-size:0.78rem;color:rgba(255,255,255,0.65);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;">Official Rental Receipt</div>
        ${contactDisplay ? `<div style="font-size:0.82rem;color:rgba(255,255,255,0.8);margin-top:8px;">📞 ${escapeHtml(contactDisplay)}</div>` : ''}
      </div>
      ${invoice?.invoiceNo ? `
      <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.3);border-radius:10px;padding:8px 14px;text-align:right;flex-shrink:0;margin-left:12px;">
        <div style="font-size:0.65rem;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.08em;">Invoice</div>
        <div style="font-weight:800;color:#fff;font-size:0.9rem;">${escapeHtml(invoice.invoiceNo)}</div>
      </div>` : ''}
    </div>

    <!-- Info Grid -->
    <div style="display:flex;flex-wrap:wrap;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <div style="flex:1 1 180px;padding:16px 20px;border-right:1px solid #e2e8f0;">
        <div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">BILLED TO</div>
        <div style="font-weight:700;color:#0f172a;">${escapeHtml(booking.clientName || '—')}</div>
        ${booking.clientPhone ? `<div style="font-size:0.8rem;color:#64748b;margin-top:2px;">📱 ${escapeHtml(booking.clientPhone)}</div>` : ''}
        ${booking.clientNic ? `<div style="font-size:0.8rem;color:#64748b;margin-top:2px;">NIC: ${escapeHtml(booking.clientNic)}</div>` : ''}
      </div>
      <div style="flex:1 1 180px;padding:16px 20px;border-right:1px solid #e2e8f0;">
        <div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">RENTAL PERIOD</div>
        <div style="font-weight:700;color:#0f172a;">${fmtDate(booking.pickupDate)}</div>
        <div style="font-size:0.8rem;color:#64748b;margin-top:2px;">to ${fmtDate(booking.returnDate)}</div>
        <div style="font-size:0.8rem;color:#4f46e5;font-weight:600;margin-top:4px;">${totalBookingDays} day${totalBookingDays !== 1 ? 's' : ''} booked</div>
      </div>
      ${paymentMethod ? `
      <div style="flex:1 1 140px;padding:16px 20px;">
        <div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">PAYMENT METHOD</div>
        <div style="font-weight:700;color:#0f172a;">${escapeHtml(paymentMethod)}</div>
      </div>` : ''}
    </div>

    <!-- Items Table -->
    <div style="padding:20px 20px 0;">
      <div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;padding-left:4px;">RENTAL ITEMS</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 8px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #e2e8f0;text-align:left;width:38%;">Item</th>
            <th style="padding:10px 8px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #e2e8f0;text-align:center;">Qty</th>
            <th style="padding:10px 8px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #e2e8f0;text-align:center;">Days</th>
            <th style="padding:10px 8px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #e2e8f0;text-align:right;">Rate/Day</th>
            <th style="padding:10px 8px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #e2e8f0;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">No items</td></tr>'}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:16px 20px 20px;">
      ${extraChargesHtml}
      <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font-size:0.95rem;border-bottom:1px solid #f1f5f9;background:#fff;">
          <span style="font-weight:700;color:#0f172a;">Grand Total</span>
          <span style="font-weight:800;color:#4f46e5;font-size:1.05rem;">${fmtMoney(totalAmount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font-size:0.95rem;border-bottom:1px solid #f1f5f9;background:#fff;color:#059669;">
          <span>Paid</span>
          <span style="font-weight:700;">− ${fmtMoney(advancePaid)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;font-size:1rem;${isPaid
    ? 'background:linear-gradient(135deg,#ecfdf5,#f0fdf4);color:#059669;border-top:2px solid #a7f3d0;'
    : 'background:linear-gradient(135deg,#fef2f2,#fff5f5);color:#dc2626;border-top:2px solid #fecaca;'}">
          <span style="font-weight:700;">${isPaid ? '✅ Fully Settled' : 'Balance Due'}</span>
          <span style="font-weight:800;font-size:1.15rem;">${fmtMoney(balance)}</span>
        </div>
      </div>
    </div>

    <!-- Legal -->
    ${legalHtml}

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:2px dashed #e2e8f0;padding:20px 24px;text-align:center;font-size:0.82rem;color:#64748b;">
      <div style="font-weight:700;font-size:0.9rem;color:#1e293b;margin-bottom:4px;">${escapeHtml(companyName)}</div>
      ${contactDisplay ? `<div style="margin-bottom:4px;">📞 ${escapeHtml(contactDisplay)}</div>` : ''}
      <div style="font-size:0.75rem;color:#94a3b8;margin-top:8px;">🧾 Digital Receipt · Generated automatically</div>
      <div style="font-size:0.7rem;color:#cbd5e1;margin-top:4px;">Thank you for choosing us!</div>
    </div>

  </div>
</body>
</html>`;
}

module.exports = { renderBillViewHtml };
