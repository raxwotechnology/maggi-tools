import React, { useState, useEffect } from 'react';
import { toolAPI, employeeAPI, dieselAPI } from '../services/api';
import { Calendar, Fuel, MessageSquare, Gauge, DollarSign, User } from 'lucide-react';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';

const ConsumablesForm = ({ onSubmit, onCancel, initialData }) => {
  const [tools, setTools] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [previousLogs, setPreviousLogs] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    employee: '',
    toolId: '',
    consumableType: 'Diesel',
    quantity: '',
    pricePerUnit: '',
    meterReading: '',
    note: '',
    status: 'Logged'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        toolId: initialData.vehicle || initialData.toolId || '',
        quantity: initialData.liters || initialData.quantity || '',
        pricePerUnit: initialData.pricePerLiter || initialData.pricePerUnit || '',
        consumableType: initialData.fuelType || initialData.consumableType || 'Diesel',
        meterReading: initialData.odometer || initialData.meterReading || '',
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        employee: '',
        toolId: '',
        consumableType: 'Diesel',
        quantity: '',
        pricePerUnit: '',
        meterReading: '',
        note: '',
        status: 'Logged'
      });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, eRes, dRes] = await Promise.all([
          toolAPI.get(), 
          employeeAPI.get(),
          dieselAPI.get()
        ]);
        setTools(Array.isArray(vRes.data) ? vRes.data : []);
        setEmployees(Array.isArray(eRes.data) ? eRes.data.filter(e => e.status === 'Active' && (e.role === 'Technician' || e.role === 'Staff')) : []);
        setPreviousLogs(Array.isArray(dRes.data) ? dRes.data : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'toolId' && value && !initialData) {
        const toolObj = tools.find(v => v.number === value);
        updated.consumableType = toolObj?.fuelType || 'Diesel';
        const lastLog = previousLogs
          .filter(l => (l.vehicle === value || l.toolId === value))
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (lastLog) {
          updated.employee = lastLog.employee || '';
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (formData.toolId && !tools.find(v => v.number.toLowerCase() === formData.toolId.toLowerCase())) {
        await toolAPI.create({ number: formData.toolId, status: 'Active' });
      }
      if (formData.employee && !employees.find(emp => emp.name.toLowerCase() === formData.employee.toLowerCase())) {
        await employeeAPI.create({ name: formData.employee, role: 'Technician', status: 'Active' });
      }
    } catch (err) { console.error(err); }

    const total = parseFloat(formData.quantity || 0) * parseFloat(formData.pricePerUnit || 0);
    onSubmit({ ...formData, total });
  };

  const total_val = parseFloat(formData.quantity || 0) * parseFloat(formData.pricePerUnit || 0);

  return (
    <form className="hire-form" onSubmit={handleSubmit}>
      <div className="hire-form-scroll">
        
        <div className="form-section">
          <p className="form-section-title"><Calendar size={16} /> Consumption Log Details</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Assigned Tool *</label>
              <Autocomplete 
                name="toolId" 
                value={formData.toolId} 
                onChange={handleChange} 
                options={tools.map(v => v.number)}
                placeholder="Tool ID"
                required
              />
            </div>
            <div className="form-group">
              <label>Technician / Staff</label>
              <Autocomplete 
                name="employee" 
                value={formData.employee || ''} 
                onChange={handleChange} 
                options={employees.map(emp => emp.name)}
                placeholder="Staff name"
              />
            </div>
          </div>
        </div>

        <div className="form-section" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)' }}>
          <p className="form-section-title" style={{ color: 'var(--accent)' }}><Fuel size={16} /> Consumption Data</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Energy / Item Type *</label>
              <select name="consumableType" value={formData.consumableType} onChange={handleChange} required>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="Electricity">Electricity</option>
                <option value="Lubricants">Lubricants</option>
                <option value="Service Parts">Service Parts</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantity (Liters/Units) *</label>
              <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleChange} required placeholder="e.g. 50.25" />
            </div>
            <div className="form-group">
              <label>Price per Unit *</label>
              <input type="number" step="0.01" name="pricePerUnit" value={formData.pricePerUnit} onChange={handleChange} required placeholder="LKR" />
            </div>
            <div className="form-group">
              <label>Meter Reading (Optional)</label>
              <input type="number" name="meterReading" value={formData.meterReading} onChange={handleChange} placeholder="Usage meter" />
            </div>
          </div>
          <div className="total-display" style={{ padding: '15px', background: 'var(--bg-side)', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '12px' }}>
             <span style={{ fontSize: '0.7rem' }}>Estimated Total Cost</span>
             <strong style={{ color: 'var(--accent)', fontSize: '1.4rem' }}>LKR {total_val.toLocaleString()}</strong>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title"><MessageSquare size={16} /> Additional Remarks</p>
          <div className="form-group">
            <label>Notes</label>
            <textarea name="note" value={formData.note} onChange={handleChange} rows="3" placeholder="Power source details, station info, etc." />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Logged">Logged</option>
              <option value="Verified">Verified</option>
            </select>
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Total Cost</span>
          <strong>LKR {total_val.toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">{initialData ? 'Update Log' : 'Save Log'}</button>
        </div>
      </div>
    </form>
  );
};

export default ConsumablesForm;
