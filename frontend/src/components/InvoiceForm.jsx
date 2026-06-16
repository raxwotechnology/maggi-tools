import React, { useState, useEffect } from 'react';
import { clientAPI, toolAPI, accountAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';

/* ── Helpers ───────────────────────────────────────────────── */
const defaultForm = () => ({
  clientName: '',
  clientPhone: '',
  clientNic: '',
  site: '',
  toolNo: '',   // Legacy
  toolCategory: '', // Legacy
  date: new Date().toISOString().split('T')[0],
  jobDescription: '',
  unitType: 'Days',
  totalUnits: 0,
  ratePerUnit: 0,
  items: [], // [{ toolNumber, model, category, dailyRate, totalUnits, unitType }]
  accessories: [], // { number, name, quantity, price }
  transportCharge: 0,
  otherCharges: 0,
  discount: 0,
  advancePayment: 0,
  totalAmount: 0,
  status: 'Draft',
  paymentMethod: 'Cash',
  accountId: ''
});

const calcTotal = (d) => {
  const itemsTotal = (d.items || []).reduce((sum, it) => sum + (Number(it.dailyRate || 0) * Number(it.totalUnits || d.totalUnits || 0)), 0);
  const accTotal = (d.accessories || []).reduce((sum, a) => sum + (Number(a.price || 0) * Number(a.quantity || 0)), 0);
  const legacyTotal = (!d.items || d.items.length === 0) ? (Number(d.totalUnits || 0) * Number(d.ratePerUnit || 0)) : 0;
  const transport = Number(d.transportCharge || 0) + Number(d.otherCharges || 0);
  const total = itemsTotal + accTotal + legacyTotal + transport - Number(d.discount || 0);
  return +total.toFixed(2);
};

/* ── Component ─────────────────────────────────────────────── */
const InvoiceForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData,   setFormData]   = useState(defaultForm());
  const [clients,    setClients]    = useState([]);
  const [tools,      setTools]      = useState([]);
  const [accList,    setAccList]    = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toolSearch, setToolSearch] = useState('');
  const [accSearch,  setAccSearch]  = useState('');

  /* Load dropdowns & pre-fill when editing */
  useEffect(() => {
    fetchLinkedData();
    if (initialData) {
      setFormData({
        ...defaultForm(),
        ...initialData,
        items: initialData.items || [],
        accessories: initialData.accessories || [],
        paymentMethod: initialData.paymentMethod || 'Cash',
        accountId: initialData.accountId || '',
        date: initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData(defaultForm());
    }
  }, [initialData]);

  const fetchLinkedData = async () => {
    try {
      const [cRes, tRes, aRes, accRes] = await Promise.all([
        clientAPI.get(),
        toolAPI.get(),
        accountAPI.get(),
        api.get('accessories')
      ]);
      setClients(Array.isArray(cRes.data) ? cRes.data : []);
      setTools(Array.isArray(tRes.data) ? tRes.data : []);
      setBankAccounts(Array.isArray(aRes.data) ? aRes.data : []);
      setAccList(Array.isArray(accRes.data) ? accRes.data : []);
    } catch (err) {
      console.error('Failed to fetch linked data', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
  };

  const addToolToInvoice = (toolNum) => {
    const t = tools.find(x => x.number === toolNum || `${x.number} - ${x.model}` === toolNum);
    if (!t) return;
    const newItem = {
      toolNumber: t.number,
      model: t.model,
      category: t.category,
      dailyRate: t.dailyRate || 0,
      totalUnits: formData.totalUnits || 1,
      unitType: formData.unitType || 'Days'
    };
    const updated = { ...formData, items: [...(formData.items || []), newItem] };
    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
    setToolSearch('');
  };

  const removeToolFromInvoice = (idx) => {
    const updated = { ...formData, items: formData.items.filter((_, i) => i !== idx) };
    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
  };

  const addAccessoryToInvoice = (accIdentifier) => {
    const a = accList.find(x => x.name === accIdentifier || x.number === accIdentifier || `${x.number || 'No ID'} - ${x.name}` === accIdentifier);
    if (!a) return;
    const newItem = { number: a.number, name: a.name, quantity: 1, price: a.price || 0 };
    const updated = { ...formData, accessories: [...(formData.accessories || []), newItem] };
    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
    setAccSearch('');
  };

  const removeAccessoryFromInvoice = (idx) => {
    const updated = { ...formData, accessories: formData.accessories.filter((_, i) => i !== idx) };
    updated.totalAmount = calcTotal(updated);
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ ...formData, totalAmount: calcTotal(formData) });
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = calcTotal(formData);

  return (
    <form onSubmit={handleSubmit} className="hire-form">
      <div className="hire-form-scroll">

        {/* ── Section 1: Customer ── */}
        <div className="form-section">
          <p className="form-section-title">Customer & Logistics</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Customer Name *</label>
              <Autocomplete 
                name="clientName" 
                value={formData.clientName} 
                onChange={handleChange} 
                options={clients.map(c => c.name)}
                placeholder="Customer name"
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input type="text" name="clientPhone" value={formData.clientPhone || ''} onChange={handleChange} placeholder="Customer Phone" />
            </div>
            <div className="form-group">
              <label>NIC / Passport</label>
              <input type="text" name="clientNic" value={formData.clientNic || ''} onChange={handleChange} placeholder="Optional ID" />
            </div>
            <div className="form-group">
              <label>Invoice Date *</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required />
            </div>
          </div>
        </div>

        {/* ── Section 2: Items Selection ── */}
        <div className="form-section">
          <p className="form-section-title">Tools / Items for Rent</p>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label>Search & Add Tool</label>
            <Autocomplete 
              name="toolSearch" 
              value={toolSearch} 
              onChange={e => {
                setToolSearch(e.target.value);
                if (tools.some(t => t.number === e.target.value || `${t.number} - ${t.model}` === e.target.value)) {
                    addToolToInvoice(e.target.value);
                }
              }} 
              options={tools.map(t => `${t.number} - ${t.model}`)}
              placeholder="Search by ID or Model..."
            />
          </div>

          {formData.items && formData.items.length > 0 ? (
            <div className="items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {formData.items.map((it, idx) => (
                <div key={idx} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr auto', 
                    gap: '10px', 
                    alignItems: 'center',
                    background: 'var(--bg-side)',
                    padding: '10px',
                    borderRadius: '8px'
                }}>
                  <div>
                    <strong style={{ fontSize: '13px' }}>{it.toolNumber}</strong>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>{it.model}</p>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input 
                        type="number" 
                        value={it.totalUnits} 
                        onChange={e => {
                            const newItems = [...formData.items];
                            newItems[idx].totalUnits = Number(e.target.value);
                            const up = { ...formData, items: newItems };
                            up.totalAmount = calcTotal(up);
                            setFormData(up);
                        }} 
                        placeholder="Units"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input 
                        type="number" 
                        value={it.dailyRate} 
                        onChange={e => {
                            const newItems = [...formData.items];
                            newItems[idx].dailyRate = Number(e.target.value);
                            const up = { ...formData, items: newItems };
                            up.totalAmount = calcTotal(up);
                            setFormData(up);
                        }} 
                        placeholder="Rate"
                    />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>
                    LKR {(it.dailyRate * it.totalUnits).toLocaleString()}
                  </div>
                  <button type="button" onClick={() => removeToolFromInvoice(idx)} style={{ color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="form-group">
                <label>Default Rental Info (Fallback)</label>
                <div className="form-grid">
                    <input type="text" name="toolNo" value={formData.toolNo} onChange={handleChange} placeholder="Tool ID" />
                    <input type="number" name="totalUnits" value={formData.totalUnits} onChange={handleChange} placeholder="Units" />
                    <input type="number" name="ratePerUnit" value={formData.ratePerUnit} onChange={handleChange} placeholder="Rate" />
                </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Accessories ── */}
        <div className="form-section">
          <p className="form-section-title">Parts & Accessories</p>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <Autocomplete 
              name="accSearch" 
              value={accSearch} 
              onChange={e => {
                setAccSearch(e.target.value);
                if (accList.some(a => a.name === e.target.value || a.number === e.target.value || `${a.number || 'No ID'} - ${a.name}` === e.target.value)) {
                  addAccessoryToInvoice(e.target.value);
                }
              }} 
              options={accList.map(a => `${a.number || 'No ID'} - ${a.name}`)}
              placeholder="Search ID or name..."
            />
          </div>
          {formData.accessories && formData.accessories.map((acc, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'var(--bg-side)', borderRadius: '6px', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px' }}>
                  {acc.number ? <strong style={{ color: 'var(--accent)', marginRight: '6px' }}>[{acc.number}]</strong> : null}
                  {acc.name} (x{acc.quantity})
                </span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>LKR {(acc.price * acc.quantity).toLocaleString()}</span>
                <button type="button" onClick={() => removeAccessoryFromInvoice(idx)} style={{ color: 'var(--danger)', border: 'none', background: 'none' }}>×</button>
            </div>
          ))}
        </div>

        {/* ── Section 4: Charges & Discounts ── */}
        <div className="form-section">
          <p className="form-section-title">Other Charges & Discount</p>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Transport Charge</label>
              <input type="number" name="transportCharge" value={formData.transportCharge} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Other Charges</label>
              <input type="number" name="otherCharges" value={formData.otherCharges} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Discount (LKR)</label>
              <input type="number" name="discount" value={formData.discount} onChange={handleChange} style={{ color: 'var(--success)', fontWeight: 'bold' }} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Advance Payment</label>
              <input type="number" name="advancePayment" value={formData.advancePayment} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          {formData.paymentMethod === 'Bank Transfer' && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Target Bank Account *</label>
              <select name="accountId" required value={formData.accountId} onChange={handleChange}>
                <option value="">Select Account</option>
                {bankAccounts.map(acc => (
                  <option key={acc._id} value={acc._id}>{acc.accountName} (LKR {acc.balance.toLocaleString()})</option>
                ))}
              </select>
            </div>
          )}
        </div>

      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Grand Total</span>
          <strong style={{ fontSize: '22px', color: 'var(--accent)' }}>LKR {grandTotal.toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Saving...' : initialData ? 'Update Invoice' : 'Save & Generate'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default InvoiceForm;
