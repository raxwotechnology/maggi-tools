import React, { useState, useEffect } from 'react';
import { clientAPI, toolAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';

/* ── Helpers ───────────────────────────────────────────────── */
const defaultForm = () => ({
  clientName: '',
  clientAddress: '',
  quotationNo: '',
  date: new Date().toISOString().split('T')[0],
  validityDays: 30,
  toolCategory: '', // Internal field name kept for schema compatibility (tool category)
  toolNo: '',   // Internal field name kept for schema compatibility (tool ID)
  refundableDeposit: 0,
  mandatoryCharge: 0,
  transportCharge: 0,
  extraHourRate: 0,
  estimatedTotal: 0,
  termsAndConditions: '',
  status: 'Draft',
});

const calcTotal = (d) =>
  +(
    Number(d.mandatoryCharge || 0) +
    Number(d.transportCharge  || 0) +
    Number(d.extraHourRate    || 0)
  ).toFixed(2);

/* ── Component ─────────────────────────────────────────────── */
const QuotationForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData,   setFormData]   = useState(defaultForm());
  const [clients,    setClients]    = useState([]);
  const [tools,   setTools]   = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLinkedData();
    if (initialData) {
      setFormData({
        ...defaultForm(),
        ...initialData,
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
      const [cRes, tRes] = await Promise.all([
        clientAPI.get(),
        toolAPI.get(),
      ]);
      setClients(Array.isArray(cRes.data) ? cRes.data : []);
      setTools(Array.isArray(tRes.data) ? tRes.data : []);
    } catch (err) {
      console.error('Failed to fetch linked data', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    
    if (name === 'clientName') {
      const clientObj = clients.find(c => c.name === value);
      if (clientObj) updated.clientAddress = clientObj.address || '';
    }

    if (name === 'toolNo') { // tool ID
      const toolObj = tools.find(t => t.number === value);
      if (toolObj) updated.toolCategory = toolObj.category || '';
    }

    updated.estimatedTotal = calcTotal(updated);
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (formData.clientName && !clients.find(c => c.name.toLowerCase() === formData.clientName.toLowerCase())) {
        await clientAPI.create({ name: formData.clientName, status: 'Active' });
      }
      if (formData.toolNo && !tools.find(t => t.number.toLowerCase() === formData.toolNo.toLowerCase())) {
        await toolAPI.create({ number: formData.toolNo, status: 'Active' });
      }
    } catch (err) { console.error('Auto-creation failed', err); }

    try {
      await onSubmit({ ...formData, estimatedTotal: calcTotal(formData) });
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
                options={clients.map(c => c.name)}
                placeholder="Type customer name"
                required
              />
            </div>

            <div className="form-group">
              <label>Quotation Number</label>
              <input
                type="text" name="quotationNo"
                value={formData.quotationNo} onChange={handleChange}
                placeholder="Optional"
              />
            </div>

            <div className="form-group">
              <label>Validity (Days)</label>
              <input
                type="number" name="validityDays"
                value={formData.validityDays} onChange={handleChange}
                min="1"
              />
            </div>

          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Quotation Date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Customer Address</label>
            <textarea
              name="clientAddress" value={formData.clientAddress}
              onChange={handleChange} rows="2"
              placeholder="Official address..."
            />
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Tool Specifications Required</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Tool ID / Serial</label>
              <Autocomplete 
                name="toolNo" 
                value={formData.toolNo} 
                onChange={handleChange} 
                options={tools.map(t => t.number)}
                placeholder="Tool ID"
              />
            </div>

            <div className="form-group">
              <label>Tool Category</label>
              <select name="toolCategory" value={formData.toolCategory} onChange={handleChange}>
                <option value="">Select Category</option>
                <option value="Power Tools">Power Tools</option>
                <option value="Hand Tools">Hand Tools</option>
                <option value="Heavy Machinery">Heavy Machinery</option>
                <option value="Electrical Appliances">Electrical Appliances</option>
                <option value="Gardening">Gardening</option>
                <option value="Construction">Construction</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Refundable Deposit (LKR)</label>
              <input
                type="number" name="refundableDeposit"
                value={formData.refundableDeposit} onChange={handleChange}
                placeholder="Security amount"
              />
            </div>

          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Pricing &amp; Financial Offer (LKR)</p>
          <div className="form-grid">

            <div className="form-group">
              <label>Min Rental Charge</label>
              <input
                type="number" name="mandatoryCharge"
                value={formData.mandatoryCharge} onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Transport Charge</label>
              <input
                type="number" name="transportCharge"
                value={formData.transportCharge} onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Extra Usage Rate</label>
              <input
                type="number" name="extraHourRate"
                value={formData.extraHourRate} onChange={handleChange}
                min="0"
              />
            </div>

          </div>

          {grandTotal > 0 && (
            <div style={{
              margin: '12px 0 0',
              padding: '8px 12px',
              background: 'var(--accent-soft)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--accent)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>
                Rental {Number(formData.mandatoryCharge || 0).toLocaleString()} +
                Transport {Number(formData.transportCharge || 0).toLocaleString()} +
                Extra {Number(formData.extraHourRate || 0).toLocaleString()}
              </span>
              <strong>LKR {grandTotal.toLocaleString()}</strong>
            </div>
          )}
        </div>

        <div className="form-section">
          <p className="form-section-title">Terms &amp; Conditions</p>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Specific Terms</label>
            <textarea
              name="termsAndConditions" value={formData.termsAndConditions}
              onChange={handleChange} rows="4"
              placeholder="Mention working hours, usage limits, etc..."
            />
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
