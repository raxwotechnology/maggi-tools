import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';
import './CheckoutModal.css';

// Calculate days rented from pickup to a given return date (inclusive, same-day = 0 charge)
function calcDays(pickupDate, returnDateStr) {
  if (!pickupDate || !returnDateStr) return 0;
  const pickup = new Date(pickupDate);
  pickup.setHours(0, 0, 0, 0);
  const ret = new Date(returnDateStr);
  ret.setHours(0, 0, 0, 0);
  const diff = Math.round((ret - pickup) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 0;
  return diff + 1; // inclusive
}

export default function CheckoutModal({ isOpen, onClose, bookingRecord, accounts, onComplete }) {
  const [itemRows, setItemRows] = useState([]);
  const [accRows, setAccRows] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens with a booking
  useEffect(() => {
    if (isOpen && bookingRecord) {
      const todayStr = new Date().toISOString().split('T')[0];

      const items = (bookingRecord.items || []).map(it => {
        const pendingQty = (it.quantity || 1) - (it.returnedQuantity || 0);
        return {
          id: String(it._id || it.tool || ''),
          name: `${it.toolNumber || ''} - ${it.model || ''}`,
          dailyRate: Number(it.dailyRate) || 0,
          totalQty: it.quantity || 1,
          maxQty: pendingQty,
          returningQty: pendingQty, // default to max so cost shows immediately
          date: todayStr,
          selectedAction: null,
          amountPaid: it.amountPaid || 0,
        };
      });

      const accs = (bookingRecord.accessories || []).map(ac => {
        const pendingQty = (ac.quantity || 1) - (ac.returnedQuantity || 0);
        return {
          id: String(ac._id || ac.accessory || ''),
          name: ac.name || '',
          dailyRate: Number(ac.price) || 0,
          totalQty: ac.quantity || 1,
          maxQty: pendingQty,
          returningQty: pendingQty, // default to max so cost shows immediately
          date: todayStr,
          selectedAction: null,
          amountPaid: ac.amountPaid || 0,
        };
      });

      setItemRows(items);
      setAccRows(accs);
      // Pre-fill with the booking's stored balance; will be overridden by live calc
      setPaymentAmount(Number(bookingRecord.balanceAmount || bookingRecord.totalAmount || 0));
      setPaymentMethod('Cash');
      setAccountId('');
    }
  }, [isOpen, bookingRecord]);

  // ── Live cost calculation ──────────────────────────────────
  const pickupDate = bookingRecord?.pickupDate;

  /**
   * getItemTotalCost: canonical cost for one row.
   *  - Uses row.maxQty (items STILL PENDING return) not orig.quantity (total booked).
   *  - Consistent between the per-item card badge and the Bill Summary.
   *  - For "Return W/O Pay" action we still show the cost but mark it separately.
   */
  function getItemTotalCost(row, orig) {
    const days  = orig?.rentalDays || bookingRecord?.totalDays || 1;
    const qty   = Number(row.maxQty) || 0;           // pending qty only
    const rate  = Number(row.dailyRate) || 0;
    let cost    = rate * qty * days;

    // Add stored overdue charge from DB (already calculated by backend)
    cost += Number(orig?.totalOverdueCharge) || 0;

    // If return date is later than expected, add live overdue charge too
    const expRetDate = orig?.expectedReturnDate
      ? new Date(orig.expectedReturnDate)
      : new Date(bookingRecord?.returnDate || pickupDate);
    expRetDate.setHours(0, 0, 0, 0);
    const actRetDate = new Date(row.date);
    actRetDate.setHours(0, 0, 0, 0);
    if (actRetDate > expRetDate) {
      const overdueDays   = Math.ceil((actRetDate - expRetDate) / (1000 * 60 * 60 * 24));
      const penaltyRate   = Number(orig?.overdueChargePerDay) || Number(row.dailyRate) || 500;
      cost += overdueDays * penaltyRate * qty;
    }

    return cost;
  }

  // Items subtotal: sum of cost for ALL pending items
  const itemsSubtotal = itemRows.reduce((s, r) => {
    const orig = (bookingRecord?.items || []).find(it => String(it._id || it.tool) === r.id);
    return s + getItemTotalCost(r, orig);
  }, 0);

  // Accessories subtotal: sum of cost for ALL pending accessories
  const accsSubtotal = accRows.reduce((s, r) => {
    const orig = (bookingRecord?.accessories || []).find(ac => String(ac._id || ac.accessory) === r.id);
    return s + getItemTotalCost(r, orig);
  }, 0);

  const transport    = Number(bookingRecord?.transportCharge) || 0;
  const discount     = Number(bookingRecord?.discount)        || 0;
  const extraCharges = Number(bookingRecord?.extraCharges)    || 0;

  // Grand total for this return session
  const calculatedTotal = Math.max(0, itemsSubtotal + accsSubtotal + transport + extraCharges - discount);

  // Already paid = booking-level advance + ALL per-item amountPaid typed in the form
  // This updates LIVE as user types in Paid fields because itemRows/accRows are state
  const itemsPaidInForm = itemRows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0);
  const accsPaidInForm  = accRows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0);
  const advancePaid     = Number(bookingRecord?.advancePayment) || 0;
  const alreadyPaid     = advancePaid + itemsPaidInForm + accsPaidInForm;

  const remainingBalance = Math.max(0, calculatedTotal - alreadyPaid);

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (overridePaymentAmount, noReturn = false) => {
    if (!bookingRecord) return;
    setLoading(true);
    try {
      const finalPayment = typeof overridePaymentAmount === 'number' 
        ? overridePaymentAmount 
        : (paymentAmount !== '' ? Number(paymentAmount) : undefined);
        
      const payload = {
        returnedItems: noReturn ? [] : itemRows.filter(it => !it.selectedAction || it.selectedAction === 'return').map(it => ({
          id: it.id,
          quantity: Number(it.returningQty),
          date: it.date,
          amountPaid: Number(it.amountPaid) || 0,
        })),
        returnedWithoutPayItems: noReturn ? [] : itemRows.filter(it => it.selectedAction === 'return_no_pay').map(it => ({
          id: it.id,
          quantity: Number(it.returningQty),
          date: it.date,
          amountPaid: Number(it.amountPaid) || 0,
        })),
        paidNotReturnedItems: noReturn ? [] : itemRows.filter(it => it.selectedAction === 'paid_no_return').map(it => ({
          id: it.id,
          quantity: Number(it.returningQty),
          date: it.date,
          amountPaid: Number(it.amountPaid) || 0,
        })),
        returnedAccessories: noReturn ? [] : accRows.filter(ac => !ac.selectedAction || ac.selectedAction === 'return').map(ac => ({
          id: ac.id,
          quantity: Number(ac.returningQty),
          date: ac.date,
          amountPaid: Number(ac.amountPaid) || 0,
        })),
        returnedWithoutPayAccessories: noReturn ? [] : accRows.filter(ac => ac.selectedAction === 'return_no_pay').map(ac => ({
          id: ac.id,
          quantity: Number(ac.returningQty),
          date: ac.date,
          amountPaid: Number(ac.amountPaid) || 0,
        })),
        paidNotReturnedAccessories: noReturn ? [] : accRows.filter(ac => ac.selectedAction === 'paid_no_return').map(ac => ({
          id: ac.id,
          quantity: Number(ac.returningQty),
          date: ac.date,
          amountPaid: Number(ac.amountPaid) || 0,
        })),
        paymentAmount: finalPayment,
        paymentMethod,
        accountId,
      };
      await api.put(`/bookings/${bookingRecord._id}/partial-return`, payload);
      if (onComplete) onComplete();
      onClose();
    } catch (err) {
      alert('Failed to process. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleItemAction = (id, isAccessory, action) => {
    const list = isAccessory ? accRows : itemRows;
    const setter = isAccessory ? setAccRows : setItemRows;
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return;
    
    const copy = [...list];
    const item = copy[idx];
    
    if (item.selectedAction === action) {
      item.selectedAction = null;
      item.returningQty = 0;
    } else {
      item.selectedAction = action;
      item.returningQty = item.maxQty;
      item.date = new Date().toISOString().split('T')[0];
    }
    
    setter(copy);
  };

  if (!isOpen || !bookingRecord) return null;

  // Helper: render a single item/accessory return card
  const renderItemCard = (row, idx, isAcc) => {
    const origList  = isAcc ? bookingRecord?.accessories : bookingRecord?.items;
    const allRows   = isAcc ? accRows : itemRows;
    const setRows   = isAcc ? setAccRows : setItemRows;
    const orig      = (origList || []).find(o => String(o._id || (isAcc ? o.accessory : o.tool)) === row.id);
    const days      = orig?.rentalDays || bookingRecord?.totalDays || 1;
    // Use same canonical cost function as Bill Summary → always consistent
    const totalCost = getItemTotalCost(row, orig);
    // Due = total cost for this item minus what's been paid in this session
    const amtDue    = Math.max(0, totalCost - (Number(row.amountPaid) || 0));

    const expRetDate = orig?.expectedReturnDate
      ? new Date(orig.expectedReturnDate)
      : new Date(bookingRecord?.returnDate || pickupDate);
    expRetDate.setHours(0, 0, 0, 0);
    const actRetDate = new Date(row.date);
    actRetDate.setHours(0, 0, 0, 0);
    const overdueDays = actRetDate > expRetDate
      ? Math.ceil((actRetDate - expRetDate) / (1000 * 60 * 60 * 24))
      : 0;

    const updateRow = (patch) => {
      const copy = [...allRows];
      copy[idx] = { ...copy[idx], ...patch };
      setRows(copy);
    };

    const toggle = (action) => toggleItemAction(row.id, isAcc, action);

    if (row.maxQty === 0) {
      const itemDue   = orig?.amountDue !== undefined ? orig.amountDue : remainingBalance;
      const isUnpaid  = itemDue > 0;
      const st        = orig?.returnStatus;
      const chipColor = st === 'Paid Not Returned' ? 'accent'
                      : st === 'Returned W/O Pay'  ? 'danger'
                      : isUnpaid ? 'danger' : 'success';
      const chipLabel = st === 'Paid Not Returned' ? 'Paid (Not Returned)'
                      : st === 'Returned W/O Pay'  ? 'Returned W/O Pay'
                      : isUnpaid ? 'Returned — Unpaid' : '✅ Returned';
      return (
        <div key={row.id} className="rp-item-card rp-item-card--done">
          <div className="rp-item-header">
            <div className="rp-item-meta">
              {isAcc && <span className="rp-item-badge">ACC</span>}
              <span className="rp-item-name">{isAcc ? row.name : row.name}</span>
            </div>
            <span className={`rp-status-chip rp-status-chip--${chipColor}`}>{chipLabel}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={row.id} className={`rp-item-card${overdueDays > 0 ? ' rp-item-card--overdue' : ''}`}>

        {/* ─── Card Header ─── */}
        <div className="rp-item-header">
          <div className="rp-item-meta">
            {isAcc && <span className="rp-item-badge">ACC</span>}
            <div>
              <div className="rp-item-name">{row.name}</div>
              <div className="rp-item-rate">
                LKR {row.dailyRate.toLocaleString()}/day
                &nbsp;·&nbsp;
                {row.maxQty} pending qty
                &nbsp;·&nbsp;
                {days} day{days !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="rp-item-cost-badge">
            <span className="rp-item-cost-label">TOTAL</span>
            <span className="rp-item-cost-value">LKR {totalCost.toLocaleString()}</span>
          </div>
        </div>

        {/* ─── Expected Return & Overdue ─── */}
        <div className="rp-item-dates">
          <span className="rp-date-pill">
            📅 Expected {expRetDate.toLocaleDateString()}
          </span>
          {overdueDays > 0 && (
            <span className="rp-overdue-pill">
              🚨 {overdueDays} Day{overdueDays > 1 ? 's' : ''} Overdue
            </span>
          )}
        </div>

        {/* ─── Input Controls Grid ─── */}
        <div className="rp-controls-grid">
          <div className="rp-control-field">
            <label className="rp-control-label">Return Date</label>
            <input
              type="date"
              className="rp-control-input"
              value={row.date}
              onChange={e => updateRow({ date: e.target.value })}
            />
          </div>
          <div className="rp-control-field">
            <label className="rp-control-label">Qty (max {row.maxQty})</label>
            <input
              type="number"
              className="rp-control-input"
              min="0"
              max={row.maxQty}
              value={row.returningQty}
              onChange={e => updateRow({ returningQty: Math.min(row.maxQty, Math.max(0, Number(e.target.value))) })}
            />
          </div>
          <div className="rp-control-field">
            <label className="rp-control-label">Paid (LKR)</label>
            <input
              type="number"
              className="rp-control-input rp-control-input--paid"
              min="0"
              value={row.amountPaid === 0 ? '' : row.amountPaid}
              placeholder="0"
              onChange={e => updateRow({ amountPaid: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          </div>
          <div className="rp-control-field">
            <label className="rp-control-label">Due</label>
            <div className={`rp-due-display${amtDue > 0 ? ' rp-due-display--unpaid' : ' rp-due-display--clear'}`}>
              LKR {amtDue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ─── Action Pills ─── */}
        <div className="rp-action-pills">
          <button
            type="button"
            className={`rp-pill rp-pill--danger${row.selectedAction === 'return_no_pay' ? ' rp-pill--active' : ''}`}
            onClick={() => toggle('return_no_pay')}
            disabled={loading}
          >
            {row.selectedAction === 'return_no_pay' ? '✅' : '↩'} Return W/O Pay
          </button>
          <button
            type="button"
            className={`rp-pill rp-pill--accent${row.selectedAction === 'paid_no_return' ? ' rp-pill--active' : ''}`}
            onClick={() => toggle('paid_no_return')}
            disabled={loading}
          >
            {row.selectedAction === 'paid_no_return' ? '✅' : '💳'} Paid (Not Returned)
          </button>
          <button
            type="button"
            className={`rp-pill rp-pill--success${row.selectedAction === 'return' ? ' rp-pill--active' : ''}`}
            onClick={() => toggle('return')}
            disabled={loading}
          >
            {row.selectedAction === 'return' ? '✅ Returned' : '📦 Mark as Returned'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Return & Pay — ${bookingRecord.invoiceNo || bookingRecord.bookingId || 'Booking'}`}>
      <div className="rp-modal-body">

        {/* ── Booking date strip ── */}
        <div className="rp-date-strip">
          <span>📦 Picked up: <strong>{bookingRecord.pickupDate ? new Date(bookingRecord.pickupDate).toLocaleDateString() : '—'}</strong></span>
          <span className="rp-date-sep">→</span>
          <span>🏁 Expected: <strong>{bookingRecord.returnDate ? new Date(bookingRecord.returnDate).toLocaleDateString() : '—'}</strong></span>
        </div>

        {/* ── Section title ── */}
        <div className="rp-section-head">
          <span className="rp-section-label">Items Being Returned</span>
        </div>

        {itemRows.length === 0 && accRows.length === 0 && (
          <div className="rp-empty-state">
            <span>✅</span>
            <p>All items have already been returned.</p>
          </div>
        )}

        {/* Item cards */}
        {itemRows.map((it, idx) => renderItemCard(it, idx, false))}

        {/* Accessory cards */}
        {accRows.length > 0 && (
          <div className="rp-section-head" style={{ marginTop: '4px' }}>
            <span className="rp-section-label">Accessories Being Returned</span>
          </div>
        )}
        {accRows.map((ac, idx) => renderItemCard(ac, idx, true))}

        {/* ── Bill Summary ── */}
        <div className="rp-summary-card">
          <div className="rp-summary-title">📋 Bill Summary</div>

          {/* Items subtotal — only when there are pending items */}
          {itemsSubtotal > 0 && (
            <div className="rp-summary-row">
              <span>🔧 Tools Rental</span>
              <span>LKR {itemsSubtotal.toLocaleString()}</span>
            </div>
          )}
          {accsSubtotal > 0 && (
            <div className="rp-summary-row">
              <span>📦 Accessories</span>
              <span>LKR {accsSubtotal.toLocaleString()}</span>
            </div>
          )}
          {transport > 0 && (
            <div className="rp-summary-row">
              <span>🚚 Transport</span><span>LKR {transport.toLocaleString()}</span>
            </div>
          )}
          {extraCharges > 0 && (
            <div className="rp-summary-row">
              <span>➕ Extra Charges</span><span>LKR {extraCharges.toLocaleString()}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="rp-summary-row" style={{ color: 'var(--success)' }}>
              <span>🏷 Discount</span><span>− LKR {discount.toLocaleString()}</span>
            </div>
          )}

          <div className="rp-summary-row rp-summary-row--total">
            <span>Calculated Total</span>
            <span style={{ color: 'var(--accent)' }}>LKR {calculatedTotal.toLocaleString()}</span>
          </div>

          {/* Already Paid breakdown — updates live as user types in Paid fields */}
          {advancePaid > 0 && (
            <div className="rp-summary-row">
              <span style={{ color: 'var(--text-dim)' }}>Advance Paid</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>LKR {advancePaid.toLocaleString()}</span>
            </div>
          )}
          {(itemsPaidInForm + accsPaidInForm) > 0 && (
            <div className="rp-summary-row">
              <span style={{ color: 'var(--text-dim)' }}>Collected Now</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>LKR {(itemsPaidInForm + accsPaidInForm).toLocaleString()}</span>
            </div>
          )}
          <div className="rp-summary-row">
            <span style={{ color: 'var(--text-dim)' }}>Total Collected</span>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>LKR {alreadyPaid.toLocaleString()}</span>
          </div>

          <div className="rp-summary-row rp-summary-row--balance">
            <span>Remaining Balance</span>
            <span style={{ color: remainingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              LKR {remainingBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Collect Payment ── */}
        <div className="rp-payment-card">
          <div className="rp-payment-title">💰 Collect Payment Now</div>
          <div className="rp-payment-grid">
            <div className="form-group">
              <label>Amount Collecting (LKR)</label>
              <input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder={`e.g. ${remainingBalance}`}
              />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="Cash">💵 Cash</option>
                <option value="Bank Transfer">🏦 Bank Transfer</option>
                <option value="Card">💳 Card</option>
              </select>
            </div>
          </div>
          {paymentMethod === 'Bank Transfer' && (
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>Deposit to Bank Account</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">— Select Bank Account —</option>
                {(accounts || []).map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.accountName} (LKR {acc.balance?.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}
          {paymentAmount !== '' && Number(paymentAmount) > 0 && (
            <div className="rp-after-payment">
              After payment → Remaining: <strong style={{ color: Math.max(0, remainingBalance - Number(paymentAmount)) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                LKR {Math.max(0, remainingBalance - Number(paymentAmount)).toLocaleString()}
              </strong>
            </div>
          )}
        </div>

        {/* ── Actions Footer ── */}
        <div className="rp-footer">
          <button className="rp-btn rp-btn--ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="rp-btn rp-btn--save"
            onClick={() => handleSubmit(undefined, false)}
            disabled={loading}
          >
            💾 Save
          </button>
          <button
            className="rp-btn rp-btn--confirm"
            onClick={() => handleSubmit(undefined, false)}
            disabled={loading}
          >
            {loading ? '⏳ Processing…' : '✅ Confirm Return & Pay'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
