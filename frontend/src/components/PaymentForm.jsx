import React, { useState, useEffect } from 'react';
import { toolAPI, clientAPI, paymentAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import '../styles/books.css';
import '../styles/forms.css';

/* ─── Helpers ──────────────────────────────────────────────── */
const blank = () => ({
  date:         new Date().toISOString().split('T')[0],
  client:       '',
  tool:         '',
  address:      '',
  city:         '',
  days:         1,
  startHours:   0,
  endHours:     0,
  extraCharges: 0,
  hireAmount:   0,
  dayPayment:   0,
  takenAmount:  0,
  balance:      0,
  status:       'Pending',
  paymentMethod: 'Cash',
});

const fromDB = (d) => ({
  ...blank(),
  ...d,
  date:           d?.date ? new Date(d.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  address:        d?.address || '',
  city:           d?.city    || d?.location || '',
  days:           d?.days    ?? 1,
  startHours:     d?.startHours ?? d?.startKm ?? 0,
  endHours:       d?.endHours   ?? d?.endKm   ?? 0,
  extraCharges:   d?.extraCharges ?? d?.extraKmCharges ?? 0,
  hireAmount:     d?.hireAmount     ?? 0,
  dayPayment:     d?.dayPayment     ?? 0,
  takenAmount:    d?.takenAmount    ?? 0,
  balance:        d?.balance        ?? 0,
  paymentMethod:  d?.paymentMethod  || 'Cash',
});

/* Auto-calculate hours & balance — does NOT touch status */
const compute = (f) => {
  const next = { ...f };

  // Balance = hire + extra - commission - dayPayment - takenAmount
  const hire    = parseFloat(next.hireAmount)      || 0;
  const extra   = parseFloat(next.extraCharges)    || 0;
  const dayPay  = parseFloat(next.dayPayment)      || 0;
  const taken   = parseFloat(next.takenAmount)     || 0;
  
  next.balance = +(hire + extra - dayPay - taken).toFixed(2);
  return next;
};

/* Suggested status based on balance (for hint only, not forced) */
const suggestStatus = (f) => {
  const hire = parseFloat(f.hireAmount) || 0;
  return hire > 0 && (parseFloat(f.balance) || 0) <= 0 ? 'Paid' : 'Pending';
};

/* ─── Component ─────────────────────────────────────────────── */
const PaymentForm = ({ onSubmit, onCancel, initialData }) => {
  /* Reference data */
  const [tools,  setTools]  = useState([]);
  const [clients,   setClients]   = useState([]);
  const [prevJobs,  setPrevJobs]  = useState([]); // for auto-fill

  /* Form state */
  const [form, setForm] = useState(initialData ? fromDB(initialData) : blank());

  /* Re-sync when switching edit targets */
  useEffect(() => {
    setForm(initialData ? fromDB(initialData) : blank());
  }, [initialData]);

  /* Load reference data */
  useEffect(() => {
    const load = async () => {
      try {
        const [vR, cR, pR] = await Promise.all([
          toolAPI.get(),
          clientAPI.get(),
          paymentAPI.get(),
        ]);

        setTools(Array.isArray(vR.data) ? vR.data : []);
        setClients (Array.isArray(cR.data) ? cR.data : []);
        setPrevJobs(Array.isArray(pR.data) ? pR.data : []);
      } catch (err) {
        console.error('PaymentForm load error:', err);
      }
    };
    load();
  }, []);

  /* Handle any field change */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => {
      const next = { ...prev, [name]: value };

      /* Smart auto-fill on tool select (only in Add mode) */
      if (name === 'tool' && value && !initialData) {
        const last = prevJobs
          .filter(j => j.tool === value || j.vehicle === value)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (last) {
          // no driver/helper autofill
        }
      }

      /* Smart auto-fill on client select (only in Add mode) */
      if (name === 'client' && value && !initialData) {
        const last = prevJobs
          .filter(j => j.client === value)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (last) {
          if (!prev.address) next.address = last.address || '';
          if (!prev.city)    next.city    = last.city    || '';
          if (!prev.minimumHours) next.minimumHours = last.minimumHours || 0;
        }
      }

      /* Smart logic: if status is changed to 'Paid', auto-fill takenAmount to clear balance */
      if (name === 'status' && value === 'Paid') {
        const hire = parseFloat(next.hireAmount) || 0;
        const dayP = parseFloat(next.dayPayment) || 0;
        next.takenAmount = Math.max(0, +(hire - dayP).toFixed(2));
      }

      return compute(next);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Auto-create missing records
    try {
      if (form.client && !clients.find(c => c.name.toLowerCase() === form.client.toLowerCase())) {
        await clientAPI.create({ name: form.client, status: 'Active' });
      }
      if (form.tool && !tools.find(v => v.number.toLowerCase() === form.tool.toLowerCase())) {
        await toolAPI.create({ number: form.tool, status: 'Active' });
      }
    } catch (err) { console.error(err); }

    onSubmit({ ...form });
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <form onSubmit={handleSubmit} className="hire-form">
      <div className="hire-form-scroll">

        {/* ── Section 1: Logistics ─────────────────────── */}
        <div className="form-section">
          <p className="form-section-title">Logistics Information</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Date *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Company Name *</label>
              <Autocomplete 
                name="client" 
                value={form.client} 
                onChange={handleChange} 
                options={clients.map(c => c.name)}
                placeholder="Client name"
                required
              />
            </div>

            <div className="form-group">
              <label>Tool ID / Serial</label>
              <Autocomplete 
                name="tool" 
                value={form.tool} 
                onChange={handleChange} 
                options={tools.map(v => v.number)}
                placeholder="Tool ID"
              />
            </div>

            <div className="form-group">
              <label>Service Address</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="e.g. 123 Main St" />
            </div>

            <div className="form-group">
              <label>City</label>
              <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Colombo" />
            </div>

          </div>
        </div>

        {/* ── Section 2: Usage Tracking ───────────────── */}
        <div className="form-section">
          <p className="form-section-title">Rental Usage Tracking</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Rental Duration (Days)</label>
              <input type="number" name="days" value={form.days} onChange={handleChange} min="1" />
            </div>
            <div className="form-group">
              <label>Start Reading (Hrs/Units)</label>
              <input type="number" name="startHours" value={form.startHours} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>End Reading (Hrs/Units)</label>
              <input type="number" name="endHours" value={form.endHours} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Total Usage <span style={{color:'#2563EB',fontSize:'11px'}}>(auto)</span></label>
              <input type="number" value={Math.max(0, form.endHours - form.startHours)} readOnly className="input-highlight-blue" />
            </div>
          </div>
        </div>

        {/* ── Section 3: Payment Breakdown ─────────────── */}
        <div className="form-section">
          <p className="form-section-title">Payment Breakdown</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Hire Amount (LKR) *</label>
              <input type="number" name="hireAmount" value={form.hireAmount} onChange={handleChange} min="0" required />
            </div>


            <div className="form-group">
              <label>Other Charges (LKR)</label>
              <input type="number" name="extraCharges" value={form.extraCharges} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Day Payment / Advance (LKR)</label>
              <input type="number" name="dayPayment" value={form.dayPayment} onChange={handleChange} min="0" />
            </div>

            <div className="form-group">
              <label>Taken Amount (LKR)</label>
              <input type="number" name="takenAmount" value={form.takenAmount} onChange={handleChange} min="0" />
            </div>

            <div className="form-group">
              <label>Balance (LKR) <span style={{color:'#D97706',fontSize:'11px'}}>(auto)</span></label>
              <input type="number" value={form.balance} readOnly
                className={form.balance > 0 ? 'input-highlight-gold' : 'input-highlight-green'} />
            </div>

            <div className="form-group">
              <label>
                Payment Status
                {suggestStatus(form) !== form.status && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#2563EB', fontWeight: '500' }}>
                    ↑ Suggest: {suggestStatus(form)}
                  </span>
                )}
              </label>
              <select name="status" value={form.status} onChange={handleChange}
                className={form.status === 'Paid' ? 'input-highlight-green' : 'input-highlight-gold'}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* ── Sticky Footer ────────────────────────────────── */}
      <div className="hire-form-footer">
        <div className="total-display">
          <span>Hire Amount</span>
          <strong style={{ color: '#1E40AF' }}>LKR {Number(form.hireAmount || 0).toLocaleString()}</strong>
          <span style={{ margin: '0 12px', color: '#94A3B8' }}>|</span>
          <span>Balance</span>
          <strong style={{ color: form.balance > 0 ? '#DC2626' : '#059669' }}>
            LKR {Number(form.balance).toLocaleString()}
          </strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">
            {initialData ? 'Update Payment' : 'Save Payment'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PaymentForm;
