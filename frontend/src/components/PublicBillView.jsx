import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { formatDateYMD } from '../utils/dateFormat';
import './PublicBillView.css';

const getApiBase = () => {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.startsWith('172.'));

  const raw =
    import.meta.env.VITE_API_URL ||
    (isLocal
      ? `http://${window.location.hostname}:5001/api`
      : 'https://maggietools.onrender.com/api');

  let trimmed = (raw || '').trim();
  if (!trimmed) trimmed = 'https://maggietools.onrender.com/api';
  if (trimmed.toLowerCase().endsWith('/api')) trimmed += '/';
  else if (!trimmed.toLowerCase().endsWith('/api/')) trimmed = trimmed.replace(/\/+$/, '') + '/api/';
  return trimmed;
};

const fmt = (v) => `LKR ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => formatDateYMD(d);

function calcDays(pickupDate, returnDateStr) {
  if (!pickupDate || !returnDateStr) return 0;
  const p = new Date(pickupDate); p.setHours(0, 0, 0, 0);
  const r = new Date(returnDateStr); r.setHours(0, 0, 0, 0);
  const diff = Math.round((r - p) / 86400000);
  return diff <= 0 ? 0 : diff + 1;
}

const PublicBillView = ({ token }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setError('Invalid bill link.');
      setLoading(false);
      return;
    }
    const apiBase = getApiBase();
    setLoading(true);
    setError(null);

    const cleanToken = String(token).trim();
    axios
      .get(`${apiBase}bookings/bill/data/${encodeURIComponent(cleanToken)}`, {
        timeout: 25000
      })
      .then((res) => {
        if (res.data && res.data.booking) {
          setData(res.data);
        } else {
          setError('Bill details could not be found.');
        }
      })
      .catch((err) => {
        console.error('Bill load failed:', err);
        const msg =
          err.response?.data?.message ||
          (err.code === 'ECONNABORTED'
            ? 'Server is starting up. Please click retry.'
            : 'This bill link is invalid or has expired.');
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token, retryKey]);

  if (loading) return (
    <div className="public-bill-page">
      <div className="public-bill-loader">
        <div className="public-bill-spinner" />
        <p style={{ color: '#64748b', marginTop: 16, fontWeight: 600 }}>Loading your bill…</p>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Please wait a moment</span>
      </div>
    </div>
  );

  if (error || !data?.booking) return (
    <div className="public-bill-page">
      <div className="public-bill-error-card">
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
        <p style={{ color: '#dc2626', fontWeight: 700, fontSize: '1rem', margin: '0 0 16px' }}>{error || 'Bill not found.'}</p>
        <button
          type="button"
          onClick={() => setRetryKey(k => k + 1)}
          style={{
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          🔄 Retry / නැවත උත්සාහ කරන්න
        </button>
      </div>
    </div>
  );


  const { booking, invoice, settings, companyName } = data;
  const phones = (settings?.phones || []).filter(Boolean);
  const contactDisplay = phones.join(' | ') || settings?.email || '';

  const pickupDate = booking.pickupDate;
  const totalBookingDays = booking.totalDays || calcDays(pickupDate, booking.returnDate) || 1;
  const items = booking.items || [];
  const accessories = booking.accessories || [];

  // Build per-item rows with actual rented-days calculation
  const itemRows = items.map(it => {
    const qty = Number(it.quantity) || 1;
    const rate = Number(it.dailyRate) || 0;
    const returnDateStr = it.returnDates?.length > 0
      ? it.returnDates[it.returnDates.length - 1].date
      : booking.returnDate;
    const days = calcDays(pickupDate, returnDateStr) || totalBookingDays;
    const amount = rate * qty * days;
    return { name: `${it.toolNumber || ''} — ${it.model || 'Tool'}`, qty, rate, days, amount };
  });

  const accRows = accessories.map(ac => {
    const qty = Number(ac.quantity) || 1;
    const rate = Number(ac.price) || 0;
    const returnDateStr = ac.returnDates?.length > 0
      ? ac.returnDates[ac.returnDates.length - 1].date
      : booking.returnDate;
    const days = calcDays(pickupDate, returnDateStr) || totalBookingDays;
    const amount = rate * qty * days;
    return { name: ac.name || 'Accessory', qty, rate, days, amount };
  });

  // Sold tools are a one-time purchase — price × qty, no per-day multiplier.
  const soldRows = (booking.soldItems || []).map(s => {
    const qty = Number(s.quantity) || 1;
    const price = Number(s.price) || 0;
    return { name: `${s.toolNumber || ''} — ${s.model || 'Tool'}`, qty, rate: price, days: null, amount: price * qty };
  });

  const transport = Number(booking.transportCharge) || 0;
  const fuel = Number(booking.fuelCharge) || 0;
  const labour = Number(booking.labourCharge) || 0;
  const otherCharges = Number(booking.extraCharges) || 0;
  const deposit = Number(booking.securityDeposit ?? booking.deposit) || 0;
  const discount = Number(booking.discount) || 0;
  const totalAmount = Number(booking.totalAmount) || 0;
  const advancePaid = Number(booking.advancePayment) || 0;
  const balance = Number(booking.balanceAmount) || Math.max(0, totalAmount - advancePaid);
  const isPaid = balance <= 0;
  const paymentMethod = booking.paymentMethod || '';

  const allRows = [
    ...itemRows.map(r => ({ ...r, type: 'Tool' })),
    ...accRows.map(r => ({ ...r, type: 'Accessory' })),
    ...soldRows.map(r => ({ ...r, type: 'Sold' }))
  ];

  return (
    <div className="public-bill-page">
      {/* Watermark for paid invoices */}
      {isPaid && <div className="public-bill-watermark">PAID</div>}

      <div className="public-bill-card">
        {/* ── Header ── */}
        <div className="public-bill-header">
          <div className="public-bill-header-accent" />
          <div className="public-bill-header-content">
            <h1 className="public-bill-company-name">{companyName || 'MAGGI TOOLS'}</h1>
            <div className="public-bill-subtitle">Official Rental Receipt</div>
            {contactDisplay && (
              <div className="public-bill-contact-line">📞 {contactDisplay}</div>
            )}
          </div>
          {invoice?.invoiceNo && (
            <div className="public-bill-invoice-badge">
              <div className="public-bill-invoice-badge-label">Invoice</div>
              <div className="public-bill-invoice-badge-num">{invoice.invoiceNo}</div>
            </div>
          )}
        </div>

        {/* ── Customer Info ── */}
        <div className="public-bill-info-grid">
          <div className="public-bill-info-block">
            <div className="public-bill-info-title">BILLED TO</div>
            <div className="public-bill-info-primary">{booking.clientName || '—'}</div>
            {booking.clientPhone && <div className="public-bill-info-sub">📱 {booking.clientPhone}</div>}
            {booking.clientNic && <div className="public-bill-info-sub">NIC: {booking.clientNic}</div>}
          </div>
          <div className="public-bill-info-block">
            <div className="public-bill-info-title">RENTAL PERIOD</div>
            <div className="public-bill-info-primary">{fmtDate(booking.pickupDate)}</div>
            <div className="public-bill-info-sub">to {fmtDate(booking.returnDate)}</div>
            <div className="public-bill-days-pill">
              {totalBookingDays} day{totalBookingDays !== 1 ? 's' : ''} booked
            </div>
          </div>
          {paymentMethod && (
            <div className="public-bill-info-block">
              <div className="public-bill-info-title">PAYMENT METHOD</div>
              <div className="public-bill-info-primary">{paymentMethod}</div>
            </div>
          )}
        </div>

        {/* ── Items Cards (mobile-friendly) ── */}
        <div className="public-bill-section">
          <div className="public-bill-section-label">RENTAL ITEMS ({allRows.length})</div>

          {allRows.map((row, i) => (
            <div key={i} className={`public-bill-item-card ${i % 2 === 1 ? 'alt' : ''}`}>
              {/* Row 1: Name + Amount */}
              <div className="public-bill-item-top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="public-bill-item-name">
                    {row.name}
                  </div>
                  <div className="public-bill-item-type">{row.type}</div>
                </div>
                <div className="public-bill-item-amount">
                  {fmt(row.amount)}
                </div>
              </div>
              {/* Row 2: Qty × Days @ Rate */}
              <div className="public-bill-item-badges">
                <span className="public-bill-badge">
                  Qty: <strong>{row.qty}</strong>
                </span>
                {row.days !== null && (
                  <span className="public-bill-badge accent">
                    {row.days} day{row.days !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="public-bill-badge">
                  {fmt(row.rate)}{row.days !== null ? '/day' : ''}
                </span>
              </div>
            </div>
          ))}

          {allRows.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '0.88rem' }}>No items found.</div>
          )}
        </div>

        {/* ── Charges & Totals ── */}
        <div className="public-bill-totals-section">
          {/* Extra charges */}
          {(transport > 0 || fuel > 0 || labour > 0 || otherCharges > 0 || deposit > 0 || discount > 0 || booking.totalOverdueCharges > 0) && (
            <div className="public-bill-charges-block">
              {transport > 0 && <div className="public-bill-charge-row"><span>Transport</span><strong>{fmt(transport)}</strong></div>}
              {fuel > 0 && <div className="public-bill-charge-row"><span>Fuel / Petrol</span><strong>{fmt(fuel)}</strong></div>}
              {labour > 0 && <div className="public-bill-charge-row"><span>Labour Charge {booking.operatorName ? `(${booking.operatorName})` : ''}</span><strong>{fmt(labour)}</strong></div>}
              {otherCharges > 0 && <div className="public-bill-charge-row"><span>Other Charges</span><strong>{fmt(otherCharges)}</strong></div>}
              {(booking.totalOverdueCharges > 0) && <div className="public-bill-charge-row danger"><span>Late Return / Overdue Charges</span><strong>+ {fmt(booking.totalOverdueCharges)}</strong></div>}
              {deposit > 0 && <div className="public-bill-charge-row"><span>Security Deposit</span><strong>{fmt(deposit)}</strong></div>}
              {discount > 0 && <div className="public-bill-charge-row success"><span>Discount</span><strong>− {fmt(discount)}</strong></div>}
            </div>
          )}

          {/* Final amounts */}
          <div className="public-bill-totals-block">
            <div className="public-bill-total-row grand">
              <span>Grand Total</span>
              <span className="public-bill-total-val">{fmt(totalAmount)}</span>
            </div>
            {advancePaid > 0 && (
              <div className="public-bill-total-row paid">
                <span>Paid</span>
                <span>− {fmt(advancePaid)}</span>
              </div>
            )}
            <div className={`public-bill-balance-box ${isPaid ? 'settled' : 'due'}`}>
              <div className="public-bill-balance-label">{isPaid ? '✅ Fully Settled' : 'Balance Due'}</div>
              <div className="public-bill-balance-amount">{fmt(balance)}</div>
            </div>
          </div>
        </div>

        {/* ── Legal ── */}
        {(settings?.termsConditions || settings?.privacyPolicy) && (
          <div className="public-bill-legal-section">
            {settings?.termsConditions && (
              <div className="public-bill-legal-card">
                <div className="public-bill-legal-title">📋 Terms &amp; Conditions</div>
                <div style={{ whiteSpace: 'pre-line' }}>{settings.termsConditions}</div>
              </div>
            )}
            {settings?.privacyPolicy && (
              <div className="public-bill-legal-card">
                <div className="public-bill-legal-title">🔒 Privacy Policy</div>
                <div style={{ whiteSpace: 'pre-line' }}>{settings.privacyPolicy}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="public-bill-footer">
          <div className="public-bill-footer-brand">
            {companyName || 'MAGGI TOOLS'}
          </div>
          {contactDisplay && <div style={{ marginBottom: 4 }}>📞 {contactDisplay}</div>}
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
            🧾 Digital Receipt · Generated automatically
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicBillView;
