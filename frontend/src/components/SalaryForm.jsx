import React, { useState, useEffect } from 'react';
import { vehicleAPI, employeeAPI, hireAPI, attendanceAPI, advanceAPI } from '../services/api';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';

const SalaryForm = ({ onSubmit, onCancel, initialData }) => {
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [hireData, setHireData] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [advances, setAdvances] = useState([]);

  const [formData, setFormData] = useState(initialData || {
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    employee: '',
    basic: 0,
    hourlyEarnings: 0,
    dailyAllowance: 0,
    attendanceBonus: 0,
    attendancePenalty: 0,
    incentive: 0,
    advance: 0,
    workingDays: 0,
    totalHours: 0,
    jobsCount: 0,
    status: 'Pending',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        attendanceBonus: initialData.attendanceBonus || 0,
        attendancePenalty: initialData.attendancePenalty || 0,
        status: initialData.status || 'Pending',
        paymentMethod: initialData.paymentMethod || 'Cash',
        paymentDate: initialData.paymentDate 
          ? new Date(initialData.paymentDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, eRes, hRes, aRes, advRes] = await Promise.all([
          vehicleAPI.get(), 
          employeeAPI.get(),
          hireAPI.get(),
          attendanceAPI.get(),
          advanceAPI.get()
        ]);
        setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
        setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
        setHireData(Array.isArray(hRes.data) ? hRes.data : []);
        setAttendance(Array.isArray(aRes.data) ? aRes.data : []);
        setAdvances(Array.isArray(advRes.data) ? advRes.data : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const calculateSalary = () => {
    if (!formData.employee) {
      alert("Please select an employee first.");
      return;
    }
    const emp = employees.find(e => e.name.trim() === formData.employee.trim());
    if (!emp) {
      alert("Selected employee not found in database.");
      return;
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const parts = formData.month.replace(',', '').split(' ');
    let targetMonth = -1;
    let targetYear = -1;

    parts.forEach(p => {
      const mIdx = monthNames.findIndex(m => p.toLowerCase().includes(m.toLowerCase()));
      if (mIdx !== -1) targetMonth = mIdx;
      if (p.match(/^\d{4}$/)) targetYear = parseInt(p);
    });

    if (targetMonth === -1 || targetYear === -1) {
       const d = new Date(formData.month);
       if (!isNaN(d.getTime())) {
         targetMonth = d.getMonth();
         targetYear = d.getFullYear();
       }
    }

    if (targetMonth === -1 || targetYear === -1) {
       alert("Invalid month format. Please use 'Month Year'.");
       return;
    }

    const jobs = hireData.filter(h => {
      const d = new Date(h.date);
      return (h.operatorName?.trim() === emp.name.trim() || h.helperName?.trim() === emp.name.trim()) && 
             d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const workDays = attendance.filter(a => {
      const d = new Date(a.date);
      return a.employee?.trim() === emp.name.trim() && a.status === 'Present' && 
             d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    }).length;

    const empAdvances = advances
      .filter(a => a.employee === emp.name && a.month === formData.month)
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    let basic = 0;
    let hourlyEarnings = 0;
    let dailyAllowance = 0;
    let totalHours = 0;
    let attendanceBonus = 0;
    let attendancePenalty = 0;

    if (emp.role === 'Operator' || emp.role === 'Manager') {
      basic = emp.basicSalary || 0;
      if (workDays < 5 && workDays > 0) attendancePenalty = 1000;
      if (workDays > 25) attendanceBonus = (workDays - 25) * 1000;
      
      if (emp.role === 'Operator') {
        totalHours = jobs.reduce((sum, j) => sum + (parseFloat(j.workingHours) || 0), 0);
        hourlyEarnings = totalHours * (emp.hourlyRate || 0);
        dailyAllowance = workDays * 500;
      }
    } else if (emp.role === 'Helper') {
      const hiresByDate = {};
      jobs.forEach(h => {
          const dateStr = new Date(h.date).toDateString();
          if (!hiresByDate[dateStr]) hiresByDate[dateStr] = { morning: false, afternoon: false };
          const startHour = parseInt((h.startTime || '00:00').split(':')[0]);
          const endHour = parseInt((h.endTime || '23:59').split(':')[0]);
          if (startHour < 13) hiresByDate[dateStr].morning = true;
          if (endHour >= 13) hiresByDate[dateStr].afternoon = true;
      });
      let shiftPay = 0;
      Object.values(hiresByDate).forEach(s => {
          if (s.morning) shiftPay += 3000;
          if (s.afternoon) shiftPay += 3000;
      });
      hourlyEarnings = shiftPay;
      totalHours = jobs.length;
    }

    setFormData(prev => ({
      ...prev,
      basic,
      workingDays: workDays,
      dailyAllowance,
      hourlyEarnings,
      attendanceBonus,
      attendancePenalty,
      advance: empAdvances,
      totalHours,
      jobsCount: jobs.length
    }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value 
    });
  };

  const parseVal = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const netPay_val = parseVal(formData.basic) + 
                    parseVal(formData.hourlyEarnings) + 
                    parseVal(formData.dailyAllowance) + 
                    parseVal(formData.attendanceBonus) + 
                    parseVal(formData.incentive) - 
                    parseVal(formData.attendancePenalty) - 
                    parseVal(formData.advance);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = { ...formData };
    // Ensure all numeric fields are actual numbers, not empty strings or NaN
    ['basic', 'hourlyEarnings', 'dailyAllowance', 'attendanceBonus', 'attendancePenalty', 'incentive', 'advance', 'workingDays', 'totalHours', 'jobsCount'].forEach(field => {
      finalData[field] = parseVal(finalData[field]);
    });

    onSubmit({ ...finalData, netPay: netPay_val });
  };

  return (
    <form className="hire-form" onSubmit={handleSubmit}>
      <div className="hire-form-scroll">
        <div className="form-section">
          <p className="form-section-title">Record Details</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Payroll Month *</label>
              <input type="text" name="month" value={formData.month} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Employee Name *</label>
              <Autocomplete name="employee" value={formData.employee} onChange={handleChange} options={employees.map(e => e.name)} required />
            </div>
          </div>
          <button type="button" onClick={calculateSalary} className="add-btn-batch" style={{ marginTop: '16px', background: '#2563EB' }}>
            🔄 Auto-Calculate Earnings
          </button>
        </div>

        <div className="form-section">
          <p className="form-section-title">Earnings Breakdown</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Basic Pay</label>
              <input type="number" name="basic" value={formData.basic} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Hourly/Shift Pay</label>
              <input type="number" name="hourlyEarnings" value={formData.hourlyEarnings} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Daily Allowance</label>
              <input type="number" name="dailyAllowance" value={formData.dailyAllowance} onChange={handleChange} />
            </div>
          </div>
          <div className="form-grid" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Attendance Bonus</label>
              <input type="number" name="attendanceBonus" value={formData.attendanceBonus} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Attendance Penalty (-)</label>
              <input type="number" name="attendancePenalty" value={formData.attendancePenalty} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Incentives (Manual)</label>
              <input type="number" name="incentive" value={formData.incentive} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <p className="form-section-title">Payment Confirmation</p>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Payment Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid / Settled</option>
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
            <div className="form-group">
              <label>Payment Date</label>
              <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Final Net Salary</span>
          <strong>LKR {netPay_val.toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="submit-btn">Finalize Record</button>
        </div>
      </div>
    </form>
  );
};

export default SalaryForm;
