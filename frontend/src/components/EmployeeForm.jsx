import React, { useState, useEffect } from 'react';
import '../styles/forms.css';

const EmployeeForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: '', nic: '', role: 'Technician', contact: '',
    joinedDate: new Date().toISOString().split('T')[0],
    status: 'Active', username: '', password: '',
    basicSalary: 0, hourlyRate: 0,
    salaryCategory: 'Monthly'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        username: initialData.username || '',
        password: '',
        salaryCategory: initialData.salaryCategory || 'Monthly',
        joinedDate: initialData.joinedDate
          ? new Date(initialData.joinedDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      });
    } else {
      setFormData({
        name: '', nic: '', role: 'Technician', contact: '',
        joinedDate: new Date().toISOString().split('T')[0],
        status: 'Active', username: '', password: '',
        basicSalary: 0, hourlyRate: 0,
        salaryCategory: 'Monthly'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value 
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submittableData = { ...formData };
    if (!submittableData.password && initialData) {
      delete submittableData.password;
    }
    onSubmit(submittableData);
  };

  return (
    <form className="hire-form" onSubmit={handleSubmit}>
      <div className="hire-form-scroll">
        
        <div className="form-section">
          <p className="form-section-title">Personal Details</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Kamal Perera"
                required
              />
            </div>
            <div className="form-group">
              <label>NIC Number</label>
              <input
                type="text"
                name="nic"
                value={formData.nic}
                onChange={handleChange}
                placeholder="e.g. 991234567V"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Work Information</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="Technician">Technician</option>
                <option value="Operator">Operator</option>
                <option value="Helper">Staff / Helper</option>
                <option value="Mechanic">Mechanic</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Salary Configuration</p>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Basic Salary (Monthly)</label>
              <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} placeholder="e.g. 30000" />
            </div>
            <div className="form-group">
              <label>Hourly Rate (Rentals)</label>
              <input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} placeholder="e.g. 200" />
            </div>
            <div className="form-group">
              <label>Salary Cycle</label>
              <select name="salaryCategory" value={formData.salaryCategory} onChange={handleChange}>
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Day Payment">Day Payment</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Logistics & Contact</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Contact Number</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="e.g. 077 123 4567"
              />
            </div>
            <div className="form-group">
              <label>Joined Date</label>
              <input
                type="date"
                name="joinedDate"
                value={formData.joinedDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">System Access (Optional)</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Login username"
              />
            </div>
            <div className="form-group">
              <label>Password {initialData && '(Leave blank to keep current)'}</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Login password"
                required={!initialData && formData.username}
              />
            </div>
          </div>
        </div>

      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Registration</span>
          <strong>{formData.role || 'New Staff'}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">
            {initialData ? 'Update Record' : 'Register Staff'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default EmployeeForm;
