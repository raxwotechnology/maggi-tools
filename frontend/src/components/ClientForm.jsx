import React, { useState, useEffect } from 'react';
import '../styles/forms.css';

const ClientForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    nic: '',
    contact: '',
    status: 'Active'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        nic: '',
        contact: '',
        status: 'Active'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="hire-form" onSubmit={handleSubmit}>
      <div className="hire-form-scroll">
        
        <div className="form-section">
          <p className="form-section-title">Client Information</p>
          <div className="form-group">
            <label>Full Company / Client Name *</label>
            <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                placeholder="e.g. ABC Logistics"
            />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>NIC Number</label>
            <input 
                type="text" 
                name="nic" 
                value={formData.nic} 
                onChange={handleChange} 
                placeholder="e.g. 991234567V"
            />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Contact Number / Tel *</label>
            <input 
                type="text" 
                name="contact" 
                value={formData.contact} 
                onChange={handleChange} 
                required 
                placeholder="e.g. 011 234 5678"
            />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Record Type</span>
          <strong>Client Profile</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">{initialData ? 'Update Client' : 'Save Client'}</button>
        </div>
      </div>
    </form>
  );
};

export default ClientForm;
