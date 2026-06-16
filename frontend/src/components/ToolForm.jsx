import React, { useState, useEffect } from 'react';
import { toolAPI } from '../services/api';
import { Wrench, Hash, Zap, Calendar, Shield, CreditCard, Package, Settings, Tag, Info, Search, Truck, BatteryCharging } from 'lucide-react';
import '../styles/forms.css';

const ToolForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    number: '',
    model: '',
    category: 'General',
    powerSource: '',
    dailyRate: '',
    stock: 1,
    warrantyExpirationDate: '',
    nextServiceDate: '',
    lastServiceDate: '',
    warrantyEmiNumber: '',
    hasWarranty: false,
    hasLeasing: false,
    leasingCompany: '',
    monthlyPremium: '',
    leaseDueDate: '',
    leaseFinalDate: '',
    financeEmiNumber: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        warrantyExpirationDate: initialData.warrantyExpirationDate ? new Date(initialData.warrantyExpirationDate).toISOString().split('T')[0] : '',
        nextServiceDate: initialData.nextServiceDate ? new Date(initialData.nextServiceDate).toISOString().split('T')[0] : '',
        lastServiceDate: initialData.lastServiceDate ? new Date(initialData.lastServiceDate).toISOString().split('T')[0] : '',
        leaseFinalDate: initialData.leaseFinalDate ? new Date(initialData.leaseFinalDate).toISOString().split('T')[0] : ''
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await toolAPI.getNextNumber();
        if (!cancelled && res.data?.number) {
          setFormData((prev) => ({ ...prev, number: res.data.number }));
        }
      } catch (err) {
        console.warn('Could not fetch next tool ID:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!initialData && !String(payload.number || '').trim()) {
        delete payload.number;
      }
      if (initialData) {
        await toolAPI.update(initialData._id, payload);
      } else {
        await toolAPI.create(payload);
      }
      onSubmit();
    } catch (err) {
      console.error(err);
      alert('Failed to save tool. Check if Tool ID is unique.');
    } finally {
      setLoading(false);
    }
  };

  const getToggleStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
    background: isActive ? 'var(--accent-soft)' : 'var(--bg-main)',
    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s ease',
    fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--accent)' : 'var(--text-main)',
    userSelect: 'none'
  });

  const sectionStyle = {
    background: 'var(--bg-card)', padding: '20px', borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border-soft)',
    marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px'
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', paddingLeft: '42px', borderRadius: '10px',
    border: '1px solid var(--border)', background: 'var(--bg-main)',
    fontSize: '0.9rem', color: 'var(--text-main)', transition: 'all 0.2s ease',
    outline: 'none'
  };

  const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '6px' };
  const iconWrapStyle = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
      
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, var(--bg-card), var(--bg-main))' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {initialData ? <Wrench className="text-accent" /> : <Package className="text-accent" />}
          {initialData ? 'Update Inventory Record' : 'Register New Tool'}
        </h2>
        <p style={{ margin: '5px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>Fill in the details below to maintain your tool inventory.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-main)' }}>
        
        {/* Core Info */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: '700', fontSize: '1.1rem', marginBottom: '5px' }}>
            <Tag size={18} /> Basic Specifications
          </div>
          <div className="tool-form-spec-grid">
            <div>
              <label style={labelStyle}>Tool ID / Serial *</label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={iconWrapStyle} />
                <input
                  style={{ ...inputStyle, ...(initialData ? {} : { background: 'var(--bg-side)', cursor: 'not-allowed' }) }}
                  type="text"
                  required={Boolean(initialData)}
                  readOnly={!initialData}
                  placeholder="Auto-generated e.g. TL-0001"
                  value={formData.number}
                  onChange={e => setFormData({ ...formData, number: e.target.value.toUpperCase() })}
                />
              </div>
              {!initialData && (
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Tool ID is generated automatically when you save.
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Tool Model</label>
              <div style={{ position: 'relative' }}>
                <Info size={16} style={iconWrapStyle} />
                <input style={inputStyle} type="text" placeholder="e.g. Bosch Professional" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
              </div>
            </div>
            <div className="tool-form-select-wrap">
              <label style={labelStyle}>Category</label>
              <div className="tool-form-select-field">
                <Package size={16} className="tool-form-select-icon" />
                <select className="tool-form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option value="General">General</option>
                  <option value="Kitchen">Kitchen / Catering</option>
                  <option value="Electric">Power Tools</option>
                  <option value="Construction">Construction</option>
                  <option value="Garden">Garden</option>
                  <option value="Cleaning">Cleaning</option>
                </select>
              </div>
            </div>
            <div className="tool-form-select-wrap">
              <label style={labelStyle}>Power Source</label>
              <div className="tool-form-select-field">
                <Zap size={16} className="tool-form-select-icon" />
                <select className="tool-form-select" value={formData.powerSource} onChange={e => setFormData({ ...formData, powerSource: e.target.value })}>
                  <option value="">Select power source</option>
                  <option value="Electric">Electric (Corded)</option>
                  <option value="Battery">Battery Powered</option>
                  <option value="Petrol">Petrol / Diesel</option>
                  <option value="Manual">Manual / Mechanical</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div style={{ ...sectionStyle, background: 'linear-gradient(145deg, var(--bg-card), var(--accent-soft))', borderColor: 'var(--accent-glow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: '700', fontSize: '1.1rem', marginBottom: '5px' }}>
            <CreditCard size={18} /> Rental Rates & Stock
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Daily Hire Rate (LKR) *</label>
              <div style={{ position: 'relative' }}>
                <CreditCard size={16} style={iconWrapStyle} />
                <input style={{...inputStyle, borderColor: 'var(--accent)'}} type="number" required min="0" value={formData.dailyRate} onChange={e => setFormData({ ...formData, dailyRate: e.target.value === '' ? '' : Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Total Quantity *</label>
              <div style={{ position: 'relative' }}>
                <Package size={16} style={iconWrapStyle} />
                <input style={{...inputStyle, borderColor: 'var(--accent)'}} type="number" required min="1" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value === '' ? '' : Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Custom Overdue Rate / Day (LKR)</label>
              <div style={{ position: 'relative' }}>
                <CreditCard size={16} style={iconWrapStyle} />
                <input style={inputStyle} type="number" min="0" placeholder="Optional (overrides default)" value={formData.customOverdueChargePerDay ?? ''} onChange={e => setFormData({ ...formData, customOverdueChargePerDay: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>

        {/* Leasing */}
        <div style={sectionStyle}>
          <label style={getToggleStyle(formData.hasLeasing)}>
            <input type="checkbox" checked={formData.hasLeasing} onChange={e => setFormData({ ...formData, hasLeasing: e.target.checked })} style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }} />
            <Truck size={20} /> This tool is under a Lease / Finance agreement
          </label>
          
          {formData.hasLeasing && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px', padding: '15px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <div>
                <label style={labelStyle}>Leasing Company</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="text" placeholder="Company Name" value={formData.leasingCompany} onChange={e => setFormData({ ...formData, leasingCompany: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Monthly Premium (LKR)</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="number" placeholder="0.00" value={formData.monthlyPremium} onChange={e => setFormData({ ...formData, monthlyPremium: Number(e.target.value) })} />
              </div>
              <div>
                <label style={labelStyle}>Payment Due Day (1-31)</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="number" min="1" max="31" value={formData.leaseDueDate} onChange={e => setFormData({ ...formData, leaseDueDate: Number(e.target.value) })} />
              </div>
              <div>
                <label style={labelStyle}>Lease Final Date</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="date" value={formData.leaseFinalDate} onChange={e => setFormData({ ...formData, leaseFinalDate: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Finance / EMI Number</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="text" placeholder="e.g. EMI-2024-001" value={formData.financeEmiNumber || ''} onChange={e => setFormData({ ...formData, financeEmiNumber: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        {/* Warranty */}
        <div style={sectionStyle}>
          <label style={getToggleStyle(formData.hasWarranty)}>
            <input type="checkbox" checked={formData.hasWarranty} onChange={e => setFormData({ ...formData, hasWarranty: e.target.checked })} style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }} />
            <Shield size={20} /> Active Warranty & Maintenance Plan
          </label>

          {formData.hasWarranty && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px', padding: '15px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <div>
                <label style={labelStyle}>Warranty Expiry Date</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="date" value={formData.warrantyExpirationDate} onChange={e => setFormData({ ...formData, warrantyExpirationDate: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Next Service Date</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="date" value={formData.nextServiceDate} onChange={e => setFormData({ ...formData, nextServiceDate: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Last Service Date</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="date" value={formData.lastServiceDate} onChange={e => setFormData({ ...formData, lastServiceDate: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Warranty File / EMI Number</label>
                <input style={{...inputStyle, paddingLeft: '14px'}} type="text" placeholder="e.g. WRT-2024-001" value={formData.warrantyEmiNumber || ''} onChange={e => setFormData({ ...formData, warrantyEmiNumber: e.target.value })} />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>{initialData ? 'Modifying' : 'Registering'}</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{formData.number || 'New Unit'}</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            onClick={onCancel}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
            onMouseOver={e => Object.assign(e.currentTarget.style, { background: '#e2e8f0', transform: 'translateY(-2px)' })}
            onMouseOut={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-main)', transform: 'none' })}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '12px 30px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent-glow))', color: '#fff', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px var(--accent-soft)', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}
            onMouseOver={e => { if(!loading) Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: '0 6px 20px var(--accent-soft)' }) }}
            onMouseOut={e => { if(!loading) Object.assign(e.currentTarget.style, { transform: 'none', boxShadow: '0 4px 15px var(--accent-soft)' }) }}
          >
            {loading ? 'Processing...' : initialData ? 'Save Changes' : 'Register Tool'}
          </button>
        </div>
      </div>

    </form>
  );
};

export default ToolForm;
