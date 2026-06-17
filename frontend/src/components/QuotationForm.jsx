import React, { useState, useEffect } from 'react';
import { clientAPI, toolAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import { Plus, Trash2 } from 'lucide-react';
import '../styles/forms.css';

const emptyItem = () => ({
  toolNumber: '',
  model: '',
  quantity: 1,
  days: 1,
  dailyRate: 0,
  lineTotal: 0
});

const defaultForm = () => ({
  clientName: '',
  clientAddress: '',
  quotationNo: '',
  date: new Date().toISOString().split('T')[0],
  validityDays: 30,
  items: [emptyItem()],
  transportCharge: 0,
  mandatoryCharge: 0,
  extraHourRate: 0,
  discount: 0,
  refundableDeposit: 0,
  estimatedTotal: 0,
  termsAndConditions: '',
  status: 'Draft',
});

const calcItemTotal = (item) => {
  const qty = Number(item.quantity) || 1;
  const days = Number(item.days) || 1;
  const rate = Number(item.dailyRate) || 0;
  return qty * days * rate;
};

const calcTotal = (d) => {
  const items = Array.isArray(d.items) ? d.items : [];
  const itemsTotal = items.reduce((s, it) => s + calcItemTotal(it), 0);
  const extras =
    Number(d.mandatoryCharge || 0) +
    Number(d.transportCharge || 0) +
    Number(d.extraHourRate || 0) -
    Number(d.discount || 0);
  return +(itemsTotal + extras).toFixed(2);
};

const QuotationForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState(defaultForm());
  const [clients, setClients] = useState([]);
  const [tools, setTools] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLinkedData();
    if (initialData) {
      const items = Array.isArray(initialData.items) && initialData.items.length
        ? initialData.items.map((it) => ({ ...emptyItem(), ...it, lineTotal: calcItemTotal(it) }))
        : initialData.toolNo
          ? [{ ...emptyItem(), toolNumber: initialData.toolNo, model: initialData.toolCategory || '', dailyRate: initialData.mandatoryCharge || 0, days: 1, quantity: 1, lineTotal: initialData.mandatoryCharge || 0 }]
          : [emptyItem()];
      setFormData({
        ...defaultForm(),
        ...initialData,
        items,
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
      const [cRes, tRes] = await Promise.all([clientAPI.get(), toolAPI.get()]);
      setClients(Array.isArray(cRes.data) ? cRes.data : []);
      setTools(Array.isArray(tRes.data) ? tRes.data : []);
    } catch (err) {
      console.error('Failed to fetch linked data', err);
    }
  };

  const updateForm = (updater) => {
    setFormData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      next.estimatedTotal = calcTotal(next);
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'clientName') {
        const clientObj = clients.find((c) => c.name === value);
        if (clientObj) updated.clientAddress = clientObj.address || '';
      }
      return updated;
    });
  };

  const handleItemChange = (index, field, value) => {
    updateForm((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      if (field === 'toolNumber') {
        const toolObj = tools.find((t) => t.number === value);
        if (toolObj) {
          items[index].model = toolObj.model || toolObj.category || '';
          items[index].dailyRate = Number(toolObj.dailyRate) || 0;
        }
      }
      items[index].lineTotal = calcItemTotal(items[index]);
      return { ...prev, items };
    });
  };

  const addItem = () => {
    updateForm((prev) => ({ ...prev, items: [...(prev.items || []), emptyItem()] }));
  };

  const removeItem = (index) => {
    updateForm((prev) => {
      const items = (prev.items || []).filter((_, i) => i !== index);
      return { ...prev, items: items.length ? items : [emptyItem()] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (formData.clientName && !clients.find((c) => c.name.toLowerCase() === formData.clientName.toLowerCase())) {
        await clientAPI.create({ name: formData.clientName, status: 'Active' });
      }
    } catch (err) {
      console.error('Auto-creation failed', err);
    }

    try {
      const payload = {
        ...formData,
        items: (formData.items || []).map((it) => ({
          ...it,
          lineTotal: calcItemTotal(it)
        })),
        estimatedTotal: calcTotal(formData)
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = calcTotal(formData);

  return (
    <form onSubmit={handleSubmit} className="hire-form">
      <div className="hire-form-scroll">
        <div className="form-section">
          <p className="form-section-title">Quotation Details &amp; Customer</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Customer Name *</label>
              <Autocomplete
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                options={clients.map((c) => c.name)}
                placeholder="Type customer name"
                required
              />
            </div>
            <div className="form-group">
              <label>Quotation Number</label>
              <input type="text" name="quotationNo" value={formData.quotationNo} onChange={handleChange} placeholder="Auto-generated if blank" />
            </div>
            <div className="form-group">
              <label>Validity (Days)</label>
              <input type="number" name="validityDays" value={formData.validityDays} onChange={handleChange} min="1" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Quotation Date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Customer Address</label>
            <textarea name="clientAddress" value={formData.clientAddress} onChange={handleChange} rows="2" placeholder="Official address..." />
          </div>
        </div>

        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p className="form-section-title" style={{ margin: 0 }}>Tools &amp; Rental Items</p>
            <button type="button" className="refresh-btn" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Item
            </button>
          </div>
          {(formData.items || []).map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg-main)', borderRadius: '10px', padding: '14px', marginBottom: '12px', border: '1px solid var(--border)' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tool ID</label>
                  <Autocomplete
                    name={`toolNumber-${idx}`}
                    value={item.toolNumber}
                    onChange={(e) => handleItemChange(idx, 'toolNumber', e.target.value)}
                    options={tools.map((t) => t.number)}
                    placeholder="TL-0001"
                  />
                </div>
                <div className="form-group">
                  <label>Tool Name</label>
                  <input type="text" value={item.model} onChange={(e) => handleItemChange(idx, 'model', e.target.value)} placeholder="Tool name" />
                </div>
                <div className="form-group">
                  <label>Qty</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Days</label>
                  <input type="number" min="1" value={item.days} onChange={(e) => handleItemChange(idx, 'days', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Daily Rate (LKR)</label>
                  <input type="number" min="0" value={item.dailyRate} onChange={(e) => handleItemChange(idx, 'dailyRate', Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <label>Line Total</label>
                    <div style={{ fontWeight: 700, color: 'var(--accent)' }}>LKR {calcItemTotal(item).toLocaleString()}</div>
                  </div>
                  {(formData.items || []).length > 1 && (
                    <button type="button" className="action-icon-btn btn-delete" onClick={() => removeItem(idx)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="form-section">
          <p className="form-section-title">Additional Charges (LKR)</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Transport</label>
              <input type="number" name="transportCharge" value={formData.transportCharge} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Other / Base Charge</label>
              <input type="number" name="mandatoryCharge" value={formData.mandatoryCharge} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Extra Usage Rate</label>
              <input type="number" name="extraHourRate" value={formData.extraHourRate} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Discount</label>
              <input type="number" name="discount" value={formData.discount} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>Refundable Deposit</label>
              <input type="number" name="refundableDeposit" value={formData.refundableDeposit} onChange={handleChange} min="0" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Terms &amp; Conditions</p>
          <div className="form-group">
            <textarea name="termsAndConditions" value={formData.termsAndConditions} onChange={handleChange} rows="4" placeholder="Mention working hours, usage limits, validity, etc..." />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Estimated Total
          </span>
          <strong style={{ fontSize: '22px', color: 'var(--accent)' }}>
            LKR {grandTotal.toLocaleString()}
          </strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Saving...' : initialData ? 'Update Quotation' : 'Save & Issue'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default QuotationForm;
