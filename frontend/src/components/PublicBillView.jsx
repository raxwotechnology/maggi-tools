import React, { useEffect, useState } from 'react';
import axios from 'axios';

const getApiBase = () => {
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const raw = import.meta.env.VITE_API_URL || (isLocal ? `http://${window.location.hostname}:5001/api` : '');
  let trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().endsWith('/api')) trimmed += '/';
  else if (!trimmed.toLowerCase().endsWith('/api/')) trimmed = trimmed.replace(/\/+$/, '') + '/api/';
  return trimmed;
};

const fmt = (v) => `LKR ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

  useEffect(() => {
    if (!token) { setError('Invalid bill link.'); setLoading(false); return; }
    const apiBase = getApiBase();
    if (!apiBase) { setError('Bill service is not configured.'); setLoading(false); return; }
    axios
      .get(`${apiBase}bookings/bill/data/${encodeURIComponent(token)}`)
      .then((res) => setData(res.data))
      .catch(() => setError('This bill link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.loader}>
        <div style={styles.spinner} />
        <p style={{ color: '#64748b', marginTop: 16 }}>Loading your bill…</p>
      </div>
    </div>
  );

  if (error || !data?.booking) return (
    <div style={styles.page}>
      <div style={{ ...styles.card, textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
        <p style={{ color: '#dc2626', fontWeight: 700, fontSize: '1rem' }}>{error || 'Bill not found.'}</p>
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
    // Use actual return date if item was returned early; else use booking return date
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

  const transport = Number(booking.transportCharge) || 0;
  const otherCharges = Number(booking.extraCharges) || 0;
  const deposit = Number(booking.securityDeposit ?? booking.deposit) || 0;
  const discount = Number(booking.discount) || 0;
  const totalAmount = Number(booking.totalAmount) || 0;
  const advancePaid = Number(booking.advancePayment) || 0;
  const balance = Number(booking.balanceAmount) || Math.max(0, totalAmount - advancePaid);
  const isPaid = balance <= 0;
  const paymentMethod = booking.paymentMethod || '';

  return (
    <div style={styles.page}>
      {/* Watermark for paid invoices */}
      {isPaid && <div style={styles.watermark}>PAID</div>}

      <div style={styles.card}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.headerAccent} />
          <div style={styles.headerContent}>
            <div style={styles.companyName}>{companyName || 'MAGGI TOOL RENTALS'}</div>
            <div style={styles.companySubtitle}>Official Rental Receipt</div>
            {contactDisplay && (
              <div style={styles.contactLine}>📞 {contactDisplay}</div>
            )}
          </div>
          {invoice?.invoiceNo && (
            <div style={styles.invoiceBadge}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invoice</div>
              <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: '0.9rem' }}>{invoice.invoiceNo}</div>
            </div>
          )}
        </div>

        {/* ── Customer Info ── */}
        <div style={styles.infoGrid}>
          <div style={styles.infoBlock}>
            <div style={styles.infoBlockTitle}>BILLED TO</div>
            <div style={styles.infoBlockPrimary}>{booking.clientName || '—'}</div>
            {booking.clientPhone && <div style={styles.infoBlockSub}>📱 {booking.clientPhone}</div>}
            {booking.clientNic && <div style={styles.infoBlockSub}>NIC: {booking.clientNic}</div>}
          </div>
          <div style={styles.infoBlock}>
            <div style={styles.infoBlockTitle}>RENTAL PERIOD</div>
            <div style={styles.infoBlockPrimary}>{fmtDate(booking.pickupDate)}</div>
            <div style={styles.infoBlockSub}>to {fmtDate(booking.returnDate)}</div>
            <div style={{ ...styles.infoBlockSub, marginTop: 4, color: '#4f46e5', fontWeight: 600 }}>
              {totalBookingDays} day{totalBookingDays !== 1 ? 's' : ''} booked
            </div>
          </div>
          {paymentMethod && (
            <div style={styles.infoBlock}>
              <div style={styles.infoBlockTitle}>PAYMENT METHOD</div>
              <div style={styles.infoBlockPrimary}>{paymentMethod}</div>
            </div>
          )}
        </div>

        {/* ── Items Cards (mobile-friendly) ── */}
        <div style={styles.tableSection}>
          <div style={styles.sectionLabel}>RENTAL ITEMS</div>

          {[...itemRows.map(r => ({ ...r, type: 'Tool' })), ...accRows.map(r => ({ ...r, type: 'Accessory' }))].map((row, i) => (
            <div key={i} style={{
              background: i % 2 === 0 ? '#fff' : '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 10,
            }}>
              {/* Row 1: Name + Amount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem', wordBreak: 'break-word' }}>
                    {row.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{row.type}</div>
                </div>
                <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1rem', flexShrink: 0, textAlign: 'right' }}>
                  {fmt(row.amount)}
                </div>
              </div>
              {/* Row 2: Qty × Days @ Rate */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', borderRadius: 6, padding: '2px 8px' }}>
                  Qty: <strong>{row.qty}</strong>
                </span>
                <span style={{ fontSize: '0.78rem', color: '#7c3aed', background: '#ede9fe', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                  {row.days} day{row.days !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', borderRadius: 6, padding: '2px 8px' }}>
                  {fmt(row.rate)}/day
                </span>
              </div>
            </div>
          ))}

          {itemRows.length === 0 && accRows.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '0.88rem' }}>No items found.</div>
          )}
        </div>

        {/* ── Charges & Totals ── */}

        <div style={styles.totalsSection}>
          {/* Extra charges */}
          {(transport > 0 || otherCharges > 0 || deposit > 0 || discount > 0 || booking.totalOverdueCharges > 0) && (
            <div style={styles.chargesBlock}>
              {transport > 0 && <div style={styles.chargeRow}><span>Transport</span><span>{fmt(transport)}</span></div>}
              {otherCharges > 0 && <div style={styles.chargeRow}><span>Other Charges</span><span>{fmt(otherCharges)}</span></div>}
              {(booking.totalOverdueCharges > 0) && <div style={{ ...styles.chargeRow, color: '#dc2626', fontWeight: 600 }}><span>Late Return / Overdue Charges</span><span>+ {fmt(booking.totalOverdueCharges)}</span></div>}
              {deposit > 0 && <div style={styles.chargeRow}><span>Security Deposit</span><span>{fmt(deposit)}</span></div>}
              {discount > 0 && <div style={{ ...styles.chargeRow, color: '#059669' }}><span>Discount</span><span>− {fmt(discount)}</span></div>}
            </div>
          )}

          {/* Final amounts */}
          <div style={styles.totalsBlock}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Grand Total</span>
              <span style={styles.totalAmount}>{fmt(totalAmount)}</span>
            </div>
            <div style={{ ...styles.totalRow, color: '#059669' }}>
              <span>Paid</span>
              <span style={{ fontWeight: 700 }}>− {fmt(advancePaid)}</span>
            </div>
            <div style={isPaid ? styles.balancePaid : styles.balanceDue}>
              <span style={{ fontWeight: 700 }}>{isPaid ? '✅ Fully Settled' : 'Balance Due'}</span>
              <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>{fmt(balance)}</span>
            </div>
          </div>
        </div>

        {/* ── Legal ── */}
        {(settings?.termsConditions || settings?.privacyPolicy) && (
          <div style={styles.legalSection}>
            {settings?.termsConditions && (
              <div style={styles.legalBlock}>
                <div style={styles.legalTitle}>📋 Terms &amp; Conditions</div>
                <div style={{ whiteSpace: 'pre-line' }}>{settings.termsConditions}</div>
              </div>
            )}
            {settings?.privacyPolicy && (
              <div style={styles.legalBlock}>
                <div style={styles.legalTitle}>🔒 Privacy Policy</div>
                <div style={{ whiteSpace: 'pre-line' }}>{settings.privacyPolicy}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={styles.footer}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: 4 }}>
            {companyName || 'MAGGI TOOL RENTALS'}
          </div>
          {contactDisplay && <div style={{ marginBottom: 4 }}>📞 {contactDisplay}</div>}
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
            🧾 Digital Receipt · Generated automatically
          </div>
          <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: 4 }}>
            Thank you for choosing us!
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 50%, #4f46e511 100%), #f1f5f9',
    padding: '24px 12px 48px',
    fontFamily: "'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif",
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
    boxSizing: 'border-box',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    width: '100%',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  watermark: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    fontSize: '6rem',
    fontWeight: 900,
    color: 'rgba(5, 150, 105, 0.08)',
    pointerEvents: 'none',
    zIndex: 0,
    letterSpacing: '0.2em',
    userSelect: 'none',
  },
  card: {
    width: '100%',
    maxWidth: 640,
    background: '#ffffff',
    borderRadius: 20,
    boxShadow: '0 20px 60px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    alignSelf: 'flex-start',
  },
  header: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    padding: '28px 28px 22px',
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.15) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  headerContent: { flex: 1 },
  companyName: {
    fontSize: '1.45rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.5px',
    lineHeight: 1.2,
  },
  companySubtitle: {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  contactLine: {
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  invoiceBadge: {
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: '8px 14px',
    textAlign: 'right',
    flexShrink: 0,
    marginLeft: 12,
  },
  infoGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0,
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  infoBlock: {
    flex: '1 1 180px',
    padding: '16px 20px',
    borderRight: '1px solid #e2e8f0',
  },
  infoBlockTitle: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
  },
  infoBlockPrimary: {
    fontSize: '0.97rem',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  infoBlockSub: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: 2,
  },
  tableSection: {
    padding: '20px 20px 0',
  },
  sectionLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 10,
    paddingLeft: 4,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHead: {
    background: '#f8fafc',
  },
  th: {
    padding: '10px 8px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '2px solid #e2e8f0',
  },
  td: {
    padding: '12px 8px',
    fontSize: '0.88rem',
    color: '#1e293b',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f1f5f9',
  },
  trEven: { background: '#ffffff' },
  trOdd: { background: '#f8fafc' },
  daysBadge: {
    display: 'inline-block',
    background: '#ede9fe',
    color: '#7c3aed',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  totalsSection: {
    padding: '16px 20px 20px',
  },
  chargesBlock: {
    background: '#f8fafc',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 14,
    border: '1px solid #e2e8f0',
  },
  chargeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.88rem',
    color: '#64748b',
    padding: '4px 0',
  },
  totalsBlock: {
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    fontSize: '0.95rem',
    borderBottom: '1px solid #f1f5f9',
    background: '#fff',
  },
  totalLabel: {
    fontWeight: 700,
    color: '#0f172a',
  },
  totalAmount: {
    fontWeight: 800,
    color: '#4f46e5',
    fontSize: '1.05rem',
  },
  balanceDue: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'linear-gradient(135deg, #fef2f2, #fff5f5)',
    color: '#dc2626',
    fontSize: '1rem',
    borderTop: '2px solid #fecaca',
  },
  balancePaid: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
    color: '#059669',
    fontSize: '1rem',
    borderTop: '2px solid #a7f3d0',
  },
  legalSection: {
    padding: '0 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  legalBlock: {
    background: '#f8fafc',
    borderRadius: 10,
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    fontSize: '0.75rem',
    color: '#64748b',
    lineHeight: 1.65,
  },
  legalTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  },
  footer: {
    background: '#f8fafc',
    borderTop: '2px dashed #e2e8f0',
    padding: '20px 24px',
    textAlign: 'center',
    fontSize: '0.82rem',
    color: '#64748b',
  },
};

export default PublicBillView;
