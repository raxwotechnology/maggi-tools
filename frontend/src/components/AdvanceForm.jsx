import React, { useState } from 'react';

const AdvanceForm = ({ employees, onSubmit, onCancel, currentMonth }) => {
  const [formData, setFormData] = useState({
    employee: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    month: currentMonth,
    remarks: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
        ...formData,
        amount: parseFloat(formData.amount)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="hire-form">
      <div style={{ padding: '24px' }}>
        <div className="form-group">
          <label>Employee</label>
          <select 
            value={formData.employee} 
            onChange={e => setFormData({...formData, employee: e.target.value})}
            required
          >
            <option value="">Select Employee</option>
            {employees.map(e => (
              <option key={e._id} value={e.name}>{e.name} ({e.role})</option>
            ))}
          </select>
        </div>

        <div className="form-grid-2" style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label>Amount (LKR)</label>
            <input 
              type="number" 
              value={formData.amount} 
              onChange={e => setFormData({...formData, amount: e.target.value})}
              placeholder="e.g. 5000"
              required
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '16px' }}>
          <label>Month (Auto-detected)</label>
          <input 
            type="text" 
            value={formData.month} 
            readOnly 
            style={{ background: '#F1F5F9' }}
          />
        </div>

        <div className="form-group" style={{ marginTop: '16px' }}>
          <label>Remarks</label>
          <textarea 
            value={formData.remarks} 
            onChange={e => setFormData({...formData, remarks: e.target.value})}
            placeholder="Reason for advance..."
          />
        </div>
      </div>

      <div className="hire-form-footer">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="submit-btn">Save Advance</button>
      </div>
    </form>
  );
};

export default AdvanceForm;
