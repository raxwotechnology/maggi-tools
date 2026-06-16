import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';

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
          returningQty: 0,
          date: todayStr,
        };
      }).filter(it => it.maxQty > 0);

      const accs = (bookingRecord.accessories || []).map(ac => {
        const pendingQty = (ac.quantity || 1) - (ac.returnedQuantity || 0);
        return {
          id: String(ac._id || ac.accessory || ''),
          name: ac.name || '',
          dailyRate: Number(ac.price) || 0,
          totalQty: ac.quantity || 1,
          maxQty: pendingQty,
          returningQty: 0,
          date: todayStr,
        };
      }).filter(ac => ac.maxQty > 0);

      setItemRows(items);
      setAccRows(accs);
      setPaymentAmount(Number(bookingRecord.balanceAmount || 0));
      setPaymentMethod('Cash');
      setAccountId('');
    }
  }, [isOpen, bookingRecord]);

  // ── Live cost calculation ──────────────────────────────────
  const pickupDate = bookingRecord?.pickupDate;

  function rowCost(row, originalItemObj) {
    const qty = Number(row.returningQty) || 0;
    if (qty === 0) return 0;
    const baseDays = originalItemObj?.rentalDays || bookingRecord?.totalDays || 1;
    let cost = row.dailyRate * qty * baseDays;
    
    // Add overdue charge if returning late based on expectedReturnDate
    const expRetDate = originalItemObj?.expectedReturnDate ? new Date(originalItemObj.expectedReturnDate) : new Date(bookingRecord?.returnDate || pickupDate);
    expRetDate.setHours(0,0,0,0);
    const actRetDate = new Date(row.date);
    actRetDate.setHours(0,0,0,0);
    
    if (actRetDate > expRetDate) {
      const overdueDays = Math.ceil((actRetDate - expRetDate) / (1000 * 60 * 60 * 24));
      const penaltyRate = Number(originalItemObj?.overdueChargePerDay) || 500;
      cost += (overdueDays * penaltyRate * qty);
    }
    
    return cost;
  }

  const itemsTotal = itemRows.reduce((s, r) => {
    const orig = (bookingRecord?.items || []).find(it => String(it._id || it.tool) === r.id);
    return s + rowCost(r, orig);
  }, 0);
  const accsTotal = accRows.reduce((s, r) => {
    const orig = (bookingRecord?.accessories || []).find(ac => String(ac._id || ac.accessory) === r.id);
    return s + rowCost(r, orig);
  }, 0);
  const transport = Number(bookingRecord?.transportCharge) || 0;
  const discount = Number(bookingRecord?.discount) || 0;
  const extraCharges = Number(bookingRecord?.extraCharges) || 0;
  const calculatedTotal = Math.max(0, itemsTotal + accsTotal + transport + extraCharges - discount);
  const alreadyPaid = Number(bookingRecord?.advancePayment || 0);
  const remainingBalance = Math.max(0, calculatedTotal - alreadyPaid);

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!bookingRecord) return;
    setLoading(true);
    try {
      const payload = {
        returnedItems: itemRows.map(it => ({
          id: it.id,
          quantity: Number(it.returningQty),
          date: it.date,
        })),
        returnedAccessories: accRows.map(ac => ({
          id: ac.id,
          quantity: Number(ac.returningQty),
          date: ac.date,
        })),
        paymentAmount: paymentAmount !== '' ? Number(paymentAmount) : undefined,
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

  if (!isOpen || !bookingRecord) return null;

  const cardStyle = {
    background: 'var(--bg-side)',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '14px',
    border: '1px solid var(--border)',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Return & Pay — ${bookingRecord.invoiceNo || bookingRecord.bookingId || 'Booking'}`}>
      <div className="hire-form" style={{ padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>

        {/* ── Per-item return rows ── */}
        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)' }}>
          Items Being Returned
        </h4>

        {itemRows.length === 0 && accRows.length === 0 && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>All items have already been returned.</p>
        )}

        {itemRows.map((it, idx) => {
          const orig = (bookingRecord?.items || []).find(origIt => String(origIt._id || origIt.tool) === it.id);
          const days = orig?.rentalDays || bookingRecord?.totalDays || 1;
          const cost = rowCost(it, orig);
          
          const expRetDate = orig?.expectedReturnDate ? new Date(orig.expectedReturnDate) : new Date(bookingRecord?.returnDate || pickupDate);
          expRetDate.setHours(0,0,0,0);
          const actRetDate = new Date(it.date);
          actRetDate.setHours(0,0,0,0);
          let overdueDays = 0;
          if (actRetDate > expRetDate) {
            overdueDays = Math.ceil((actRetDate - expRetDate) / (1000 * 60 * 60 * 24));
          }
          // Calculate actual rented days from pickup to selected return date
          const actualRentedDays = calcDays(pickupDate, it.date) || days;

          return (
            <div key={it.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{it.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    LKR {it.dailyRate.toLocaleString()} / day &nbsp;•&nbsp; Max pending: {it.maxQty}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Expected: <span style={{ fontWeight: 600 }}>{expRetDate.toLocaleDateString()}</span>
                    {overdueDays > 0 && (
                      <span style={{ 
                        marginLeft: '8px', 
                        background: 'var(--danger-soft, #fee2e2)', 
                        color: 'var(--danger)', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontWeight: 700 
                      }}>
                        🚨 {overdueDays} Day{overdueDays > 1 ? 's' : ''} Late
                      </span>
                    )}
                  </div>
                  {it.returningQty > 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>
                      📅 Rented Days: {actualRentedDays} day{actualRentedDays !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1rem' }}>
                    LKR {cost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {it.returningQty} × {days} day{days !== 1 ? 's' : ''}
                    {overdueDays > 0 && (
                      <span style={{color: 'var(--danger)', marginLeft: '6px', fontWeight: 700}}>+ Late Fee</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-dim)' }}>Return Date:</label>
                    <input
                      type="date"
                      value={it.date}
                      onChange={e => {
                        const copy = [...itemRows];
                        copy[idx] = { ...copy[idx], date: e.target.value };
                        setItemRows(copy);
                      }}
                      style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-dim)' }}>Qty:</label>
                    <input
                      type="number"
                      min="0"
                      max={it.maxQty}
                      value={it.returningQty}
                      onChange={e => {
                        const v = Math.min(it.maxQty, Math.max(0, Number(e.target.value)));
                        const copy = [...itemRows];
                        copy[idx] = { ...copy[idx], returningQty: v };
                        setItemRows(copy);
                      }}
                      style={{ width: '65px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const copy = [...itemRows];
                    if (it.returningQty === it.maxQty) {
                      copy[idx].returningQty = 0;
                    } else {
                      copy[idx].date = new Date().toISOString().split('T')[0];
                      copy[idx].returningQty = it.maxQty;
                    }
                    setItemRows(copy);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: it.returningQty === it.maxQty ? 'var(--success-soft)' : 'var(--accent-soft)',
                    color: it.returningQty === it.maxQty ? 'var(--success)' : 'var(--accent)',
                    border: `1px solid ${it.returningQty === it.maxQty ? 'var(--success)' : 'var(--accent-border)'}`,
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '130px'
                  }}
                >
                  {it.returningQty === it.maxQty ? '✅ Returned' : 'Mark as Returned'}
                </button>
              </div>
            </div>
          );
        })}

        {accRows.map((ac, idx) => {
          const orig = (bookingRecord?.accessories || []).find(origAc => String(origAc._id || origAc.accessory) === ac.id);
          const days = orig?.rentalDays || bookingRecord?.totalDays || 1;
          const cost = rowCost(ac, orig);
          
          const expRetDate = orig?.expectedReturnDate ? new Date(orig.expectedReturnDate) : new Date(bookingRecord?.returnDate || pickupDate);
          expRetDate.setHours(0,0,0,0);
          const actRetDate = new Date(ac.date);
          actRetDate.setHours(0,0,0,0);
          let overdueDays = 0;
          if (actRetDate > expRetDate) {
            overdueDays = Math.ceil((actRetDate - expRetDate) / (1000 * 60 * 60 * 24));
          }
          // Calculate actual rented days from pickup to selected return date
          const actualRentedDays = calcDays(pickupDate, ac.date) || days;

          return (
            <div key={ac.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>[Acc] {ac.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    LKR {ac.dailyRate.toLocaleString()} / day &nbsp;•&nbsp; Max pending: {ac.maxQty}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Expected: <span style={{ fontWeight: 600 }}>{expRetDate.toLocaleDateString()}</span>
                    {overdueDays > 0 && (
                      <span style={{ 
                        marginLeft: '8px', 
                        background: 'var(--danger-soft, #fee2e2)', 
                        color: 'var(--danger)', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontWeight: 700 
                      }}>
                        🚨 {overdueDays} Day{overdueDays > 1 ? 's' : ''} Late
                      </span>
                    )}
                  </div>
                  {ac.returningQty > 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>
                      📅 Rented Days: {actualRentedDays} day{actualRentedDays !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1rem' }}>
                    LKR {cost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {ac.returningQty} × {days} day{days !== 1 ? 's' : ''}
                    {overdueDays > 0 && (
                      <span style={{color: 'var(--danger)', marginLeft: '6px', fontWeight: 700}}>+ Late Fee</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-dim)' }}>Return Date:</label>
                    <input
                      type="date"
                      value={ac.date}
                      onChange={e => {
                        const copy = [...accRows];
                        copy[idx] = { ...copy[idx], date: e.target.value };
                        setAccRows(copy);
                      }}
                      style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-dim)' }}>Qty:</label>
                    <input
                      type="number"
                      min="0"
                      max={ac.maxQty}
                      value={ac.returningQty}
                      onChange={e => {
                        const v = Math.min(ac.maxQty, Math.max(0, Number(e.target.value)));
                        const copy = [...accRows];
                        copy[idx] = { ...copy[idx], returningQty: v };
                        setAccRows(copy);
                      }}
                      style={{ width: '65px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const copy = [...accRows];
                    if (ac.returningQty === ac.maxQty) {
                      copy[idx].returningQty = 0;
                    } else {
                      copy[idx].date = new Date().toISOString().split('T')[0];
                      copy[idx].returningQty = ac.maxQty;
                    }
                    setAccRows(copy);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: ac.returningQty === ac.maxQty ? 'var(--success-soft)' : 'var(--accent-soft)',
                    color: ac.returningQty === ac.maxQty ? 'var(--success)' : 'var(--accent)',
                    border: `1px solid ${ac.returningQty === ac.maxQty ? 'var(--success)' : 'var(--accent-border)'}`,
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '130px'
                  }}
                >
                  {ac.returningQty === ac.maxQty ? '✅ Returned' : 'Mark as Returned'}
                </button>
              </div>
            </div>
          );
        })}

        {/* ── Bill Summary ── */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '14px', marginBottom: '14px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>Bill Summary</h4>
          {transport > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Transport:</span>
              <span>LKR {transport.toLocaleString()}</span>
            </div>
          )}
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Discount:</span>
              <span style={{ color: 'var(--success)' }}>− LKR {discount.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: '6px' }}>
            <span>Calculated Total:</span>
            <span style={{ color: 'var(--accent)' }}>LKR {calculatedTotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Already Paid:</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>LKR {alreadyPaid.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, padding: '8px 0 0 0', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
            <span>Remaining Balance:</span>
            <span style={{ color: remainingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              LKR {remainingBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Collect Payment ── */}
        <div style={{ background: 'var(--success-soft, #f0fdf4)', borderRadius: '8px', padding: '14px', marginBottom: '14px', border: '1px solid var(--success)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--success)' }}>Collect Payment Now</h4>
          <div className="form-grid-2">
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
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>
          {paymentMethod === 'Bank Transfer' && (
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label>Deposit to Bank Account</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">-- Select Bank Account --</option>
                {(accounts || []).map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.accountName} (Balance: LKR {acc.balance?.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}
          {paymentAmount !== '' && Number(paymentAmount) > 0 && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
              After this payment: Balance = <strong>LKR {Math.max(0, remainingBalance - Number(paymentAmount)).toLocaleString()}</strong>
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: '1.5' }}>
          Booked: {bookingRecord.pickupDate ? new Date(bookingRecord.pickupDate).toLocaleDateString() : '—'} → Expected: {bookingRecord.returnDate ? new Date(bookingRecord.returnDate).toLocaleDateString() : '—'}
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Return & Pay'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
