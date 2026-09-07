import React, { useState, useEffect } from 'react';
import api, { clientAPI, toolAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import { Plus, Trash2 } from 'lucide-react';
import '../styles/forms.css';

const emptyItem = () => ({
  toolNumber: '',
  model: '',
  category: '',
  quantity: 1,
  days: 1,
  dailyRate: 0,
  lineTotal: 0
});

const defaultForm = () => ({
  clientName: '',
  clientAddress: '',
  clientPhone: '',
  clientNic: '',
  quotationNo: '',
  date: new Date().toISOString().split('T')[0],
  validityDays: 30,
  items: [],
  accessories: [],
  transportCharge: 0,
  fuelCharge: 0,
  fuelType: '2T / 4T Engine Oil',
  labourCharge: 0,
  operatorName: '',
  otherCharges: 0,
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
  return +(qty * days * rate).toFixed(2);
};

const calcTotal = (d) => {
  const items = Array.isArray(d.items) ? d.items : [];
  const itemsTotal = items.reduce((s, it) => s + calcItemTotal(it), 0);
  const defaultDays = items[0]?.days || 1;
  const accTotal = (d.accessories || []).reduce(
    (sum, a) => sum + (Number(a.price || 0) * Number(a.quantity || 1) * defaultDays),
    0
  );
  const extras =
    Number(d.transportCharge || 0) +
    Number(d.fuelCharge || 0) +
    Number(d.labourCharge || 0) +
    Number(d.otherCharges || 0) +
    Number(d.mandatoryCharge || 0) -
    Number(d.discount || 0);
  return +Math.max(0, itemsTotal + accTotal + extras).toFixed(2);
};

const QuotationForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState(defaultForm());
  const [clients, setClients] = useState([]);
  const [tools, setTools] = useState([]);
  const [accList, setAccList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toolSearch, setToolSearch] = useState('');
  const [accSearch, setAccSearch] = useState('');

  useEffect(() => {
    fetchLinkedData();
    if (initialData) {
      const items = Array.isArray(initialData.items) && initialData.items.length
        ? initialData.items.map((it) => ({
            ...emptyItem(),
            ...it,
            days: it.days || it.rentalDays || 1,
            lineTotal: calcItemTotal(it)
          }))
        : initialData.toolNo
          ? [{
              ...emptyItem(),
              toolNumber: initialData.toolNo,
              model: initialData.toolCategory || 'Tool',
              dailyRate: initialData.mandatoryCharge || 0,
              days: 1,
              quantity: 1,
              lineTotal: initialData.mandatoryCharge || 0
            }]
          : [emptyItem()];

      setFormData({
        ...defaultForm(),
        ...initialData,
        items,
        accessories: initialData.accessories || [],
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
      const [cRes, tRes, aRes] = await Promise.all([
        clientAPI.get().catch(() => ({ data: [] })),
        toolAPI.get().catch(() => ({ data: [] })),
        api.get('accessories').catch(() => ({ data: [] }))
      ]);
      setClients(Array.isArray(cRes.data) ? cRes.data : []);
      setTools(Array.isArray(tRes.data) ? tRes.data : []);
      setAccList(Array.isArray(aRes.data) ? aRes.data : []);
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
        if (clientObj) {
          updated.clientAddress = clientObj.address || '';
          if (clientObj.phone) updated.clientPhone = clientObj.phone;
          if (clientObj.nic) updated.clientNic = clientObj.nic;
        }
      }
      return updated;
    });
  };

  const addToolToQuotation = (toolIdentifier) => {
    if (!toolIdentifier) return;
    const cleanId = String(toolIdentifier).trim();
    const t = tools.find(
      (x) =>
        x.number === cleanId ||
        `${x.number} - ${x.model}` === cleanId ||
        x.model === cleanId ||
        (x.number && cleanId.startsWith(x.number))
    );
    if (!t) return;
    if (formData.items.some((it) => it.toolNumber === t.number)) {
      return;
    }
    const defaultDays = formData.items?.[0]?.days || 1;
    const newItem = {
      toolNumber: t.number,
      model: t.model || t.category || '',
      category: t.category || '',
      dailyRate: Number(t.dailyRate) || 0,
      quantity: 1,
      days: defaultDays,
      lineTotal: Number(t.dailyRate) * defaultDays
    };
    updateForm((prev) => ({
      ...prev,
      items: [...(prev.items || []).filter((it) => it.toolNumber || it.model), newItem]
    }));
    setToolSearch('');
  };

  const addCustomItem = () => {
    updateForm((prev) => ({
      ...prev,
      items: [...(prev.items || []), emptyItem()]
    }));
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

  const removeItem = (index) => {
    updateForm((prev) => {
      const items = (prev.items || []).filter((_, i) => i !== index);
      return { ...prev, items };
    });
  };

  const addAccessoryToQuotation = (accIdentifier) => {
    if (!accIdentifier) return;
    const cleanId = String(accIdentifier).trim();
    const a = accList.find(
      (x) =>
        x.name === cleanId ||
        x.number === cleanId ||
        `${x.number || 'No ID'} - ${x.name}` === cleanId ||
        (x.name && cleanId.includes(x.name)) ||
        (x.number && cleanId.startsWith(x.number))
    );
    if (!a) return;
    const existing = formData.accessories.find(
      (acc) => (a.number && acc.number === a.number) || acc.name === a.name
    );
    if (existing) {
      updateForm((prev) => ({
        ...prev,
        accessories: prev.accessories.map((acc) =>
          (a.number && acc.number === a.number) || acc.name === a.name
            ? { ...acc, quantity: (Number(acc.quantity) || 1) + 1 }
            : acc
        )
      }));
    } else {
      const newItem = {
        number: a.number || '',
        name: a.name,
        quantity: 1,
        price: Number(a.price) || 0
      };
      updateForm((prev) => ({
        ...prev,
        accessories: [...(prev.accessories || []), newItem]
      }));
    }
    setAccSearch('');
  };

  const removeAccessory = (index) => {
    updateForm((prev) => ({
      ...prev,
      accessories: (prev.accessories || []).filter((_, i) => i !== index)
    }));
  };

  const handleAccessoryChange = (index, field, value) => {
    updateForm((prev) => {
      const accessories = [...(prev.accessories || [])];
      accessories[index] = { ...accessories[index], [field]: value };
      return { ...prev, accessories };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (
        formData.clientName &&
        !clients.find((c) => c.name.toLowerCase() === formData.clientName.toLowerCase())
      ) {
        await clientAPI.create({
          name: formData.clientName,
          phone: formData.clientPhone,
          nic: formData.clientNic,
          address: formData.clientAddress,
          status: 'Active'
        });
      }
    } catch (err) {
      console.error('Auto-creation of client failed', err);
    }

    try {
      const payload = {
        ...formData,
        items: (formData.items || []).map((it) => ({
          ...it,
          lineTotal: calcItemTotal(it)
        })),
        accessories: formData.accessories || [],
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
        {/* ── Section 1: Customer & Quotation Meta ── */}
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
              <label>Contact Phone</label>
              <input
                type="text"
                name="clientPhone"
                value={formData.clientPhone || ''}
                onChange={handleChange}
                placeholder="Customer Phone"
              />
            </div>
            <div className="form-group">
              <label>NIC / Passport</label>
              <input
                type="text"
                name="clientNic"
                value={formData.clientNic || ''}
                onChange={handleChange}
                placeholder="Customer NIC"
              />
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: '14px' }}>
            <div className="form-group">
              <label>Quotation Number</label>
              <input
                type="text"
                name="quotationNo"
                value={formData.quotationNo}
                onChange={handleChange}
                placeholder="Auto-generated (e.g. QT-1001)"
              />
            </div>
            <div className="form-group">
              <label>Quotation Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Validity (Days)</label>
              <input
                type="number"
                name="validityDays"
                value={formData.validityDays}
                onChange={handleChange}
                min="1"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px' }}>
            <label>Customer Address</label>
            <textarea
              name="clientAddress"
              value={formData.clientAddress}
              onChange={handleChange}
              rows="2"
              placeholder="Official customer address..."
            />
          </div>
        </div>

        {/* ── Section 2: Tools & Items for Rent (Matching Invoice Format) ── */}
        <div className="form-section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}
          >
            <p className="form-section-title" style={{ margin: 0 }}>
              Tools / Items for Rent
            </p>
            <button
              type="button"
              className="refresh-btn"
              onClick={addCustomItem}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Add Custom Item
            </button>
          </div>

          <div className="tool-selector tool-selector-wide" style={{ marginBottom: '12px' }}>
            <label className="tool-search-label" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
              Select tools *
            </label>
            <Autocomplete
              name="toolSearch"
              value={toolSearch}
              multiSelect
              onOptionSelect={(val) => {
                let toolNum = val;
                if (val && val.includes(' - ')) {
                  const parts = val.replace(/^\[TOOL\]\s*/, '').split(' - ');
                  toolNum = parts[0]?.trim();
                }
                addToolToQuotation(toolNum || val);
              }}
              onChange={(e) => setToolSearch(e.target.value)}
              options={tools
                .filter((t) => t?.number)
                .map((t) => `${t.number} - ${t.model || 'Tool'}`)}
              placeholder="Search and select tools"
              className="full-width-autocomplete booking-tool-search"
              emptyMessage="No tools found"
            />
          </div>

          {tools.length > 0 && (
            <div
              className="quick-acc-grid booking-tools-quick-add"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '16px',
                maxHeight: '140px',
                overflowY: 'auto',
                padding: '10px',
                background: 'var(--bg-side, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border)'
              }}
            >
              {tools.map((t) => {
                const added = formData.items.some((item) => item.toolNumber === t.number);
                return (
                  <button
                    key={t._id || t.number}
                    type="button"
                    onClick={() => addToolToQuotation(t.number)}
                    className={`quick-add-badge${added ? ' is-added' : ''}`}
                    disabled={added}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} strokeWidth={3} /> {t.number}
                  </button>
                );
              })}
            </div>
          )}

          {formData.items && formData.items.length > 0 ? (
            <div className="items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr auto',
                  gap: '10px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase'
                }}
              >
                <span>Tool / Item Description</span>
                <span>Qty</span>
                <span>Days</span>
                <span>Rate / Day (LKR)</span>
                <span style={{ textAlign: 'right' }}>Amount (LKR)</span>
                <span></span>
              </div>

              {formData.items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr auto',
                    gap: '10px',
                    alignItems: 'center',
                    background: 'var(--bg-side, #f8fafc)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <input
                      type="text"
                      value={it.toolNumber}
                      onChange={(e) => handleItemChange(idx, 'toolNumber', e.target.value)}
                      placeholder="Tool ID (e.g. TL-0082)"
                      style={{
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '4px 6px',
                        width: '120px'
                      }}
                    />
                    <input
                      type="text"
                      value={it.model}
                      onChange={(e) => handleItemChange(idx, 'model', e.target.value)}
                      placeholder="Tool name / model"
                      style={{ fontSize: '12px', marginTop: '4px', padding: '4px 6px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      placeholder="Qty"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      min="1"
                      value={it.days}
                      onChange={(e) => handleItemChange(idx, 'days', Number(e.target.value))}
                      placeholder="Days"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      min="0"
                      value={it.dailyRate}
                      onChange={(e) => handleItemChange(idx, 'dailyRate', Number(e.target.value))}
                      placeholder="Rate"
                    />
                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      textAlign: 'right'
                    }}
                  >
                    LKR {calcItemTotal(it).toLocaleString()}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    style={{
                      color: 'var(--danger)',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                border: '1px dashed var(--border)',
                borderRadius: '8px',
                color: 'var(--text-dim)'
              }}
            >
              No tools added yet. Use the search bar above or click &quot;Add Custom Item&quot;.
            </div>
          )}
        </div>

        {/* ── Section 3: Parts & Accessories (Matching Invoice Format) ── */}
        <div className="form-section">
          <p className="form-section-title">Selected Parts &amp; Accessories (Optional)</p>
          <div className="tool-selector tool-selector-wide" style={{ marginBottom: '14px' }}>
            <Autocomplete
              name="accSearch"
              value={accSearch}
              multiSelect
              onOptionSelect={(val) => {
                let accId = val;
                if (val && val.includes(' - ')) {
                  const parts = val.replace(/^\[PART\]\s*/, '').split(' - ');
                  accId = parts[0]?.trim();
                }
                addAccessoryToQuotation(accId || val);
              }}
              onChange={(e) => setAccSearch(e.target.value)}
              options={accList.map((a) => `${a.number ? `${a.number} - ` : ''}${a.name}`)}
              placeholder="Search parts & accessories to add..."
              className="full-width-autocomplete"
              emptyMessage="No parts found"
            />
          </div>

          {accList.length > 0 && (
            <div
              className="quick-acc-grid"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px',
                maxHeight: '130px',
                overflowY: 'auto',
                padding: '10px',
                background: 'var(--bg-side, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border)'
              }}
            >
              <span
                style={{
                  width: '100%',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  marginBottom: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                Quick Add:
              </span>
              {accList.map((a) => {
                const added = formData.accessories.some(
                  (acc) => acc.number === a.number || acc.name === a.name
                );
                return (
                  <button
                    key={a._id || a.number || a.name}
                    type="button"
                    onClick={() => addAccessoryToQuotation(a.name || a.number)}
                    className={`quick-add-badge${added ? ' is-added' : ''}`}
                    disabled={added}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} strokeWidth={3} /> {a.name}
                  </button>
                );
              })}
            </div>
          )}

          {formData.accessories && formData.accessories.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {formData.accessories.map((acc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr auto',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--bg-side, #f8fafc)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>
                    {acc.number && (
                      <strong style={{ color: 'var(--accent)', marginRight: '6px' }}>
                        [{acc.number}]
                      </strong>
                    )}
                    {acc.name}
                  </span>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      min="1"
                      value={acc.quantity}
                      onChange={(e) =>
                        handleAccessoryChange(idx, 'quantity', Number(e.target.value))
                      }
                      placeholder="Qty"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      min="0"
                      value={acc.price}
                      onChange={(e) =>
                        handleAccessoryChange(idx, 'price', Number(e.target.value))
                      }
                      placeholder="Unit Price"
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'right'
                    }}
                  >
                    LKR {(Number(acc.price || 0) * Number(acc.quantity || 1)).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAccessory(idx)}
                    style={{
                      color: 'var(--danger)',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 4: Fuel / Oil, Labour & Other Charges ── */}
        <div className="form-section">
          <p className="form-section-title">Rental &amp; Service Charges (LKR)</p>
          <div className="form-grid-2">
            {/* Fuel / Oil Charges */}
            <div
              style={{
                background: 'var(--bg-side, #f8fafc)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}
            >
              <strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Fuel / Oil Details
              </strong>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label>Fuel / Oil Charge (LKR)</label>
                <input
                  type="number"
                  name="fuelCharge"
                  value={formData.fuelCharge}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Fuel / Oil Type or Description</label>
                <input
                  type="text"
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleChange}
                  placeholder="e.g. 2T / 4T Engine Oil supplied with machine"
                />
              </div>
            </div>

            {/* Labour Charges */}
            <div
              style={{
                background: 'var(--bg-side, #f8fafc)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}
            >
              <strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Labour / Operator Details
              </strong>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label>Labour Charge (LKR)</label>
                <input
                  type="number"
                  name="labourCharge"
                  value={formData.labourCharge}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Assigned Operator / Staff Name</label>
                <input
                  type="text"
                  name="operatorName"
                  value={formData.operatorName}
                  onChange={handleChange}
                  placeholder="e.g. Assigned: employee"
                />
              </div>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: '14px' }}>
            <div className="form-group">
              <label>Transport &amp; Delivery</label>
              <input
                type="number"
                name="transportCharge"
                value={formData.transportCharge}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Other / Base Charges</label>
              <input
                type="number"
                name="otherCharges"
                value={formData.otherCharges}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Discount (LKR)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                min="0"
                style={{ color: 'var(--success)', fontWeight: 'bold' }}
              />
            </div>
            <div className="form-group">
              <label>Refundable Deposit (LKR)</label>
              <input
                type="number"
                name="refundableDeposit"
                value={formData.refundableDeposit}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* ── Section 5: Terms & Status ── */}
        <div className="form-section">
          <p className="form-section-title">Terms &amp; Conditions &amp; Status</p>
          <div className="form-group">
            <textarea
              name="termsAndConditions"
              value={formData.termsAndConditions}
              onChange={handleChange}
              rows="3"
              placeholder="Prices valid for 30 days. Extended usage rates apply. Refundable deposit returned on safe item inspection..."
            />
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Quotation Status</label>
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

      {/* ── Form Footer ── */}
      <div className="hire-form-footer">
        <div className="total-display" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Estimated Total
          </span>
          <strong style={{ fontSize: '22px', color: 'var(--accent)' }}>
            LKR {grandTotal.toLocaleString()}
          </strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Saving...' : initialData ? 'Update Quotation' : 'Save & Issue'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default QuotationForm;
