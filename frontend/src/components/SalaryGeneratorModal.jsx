import React, { useState, useEffect } from 'react';
import { employeeAPI, hireAPI, attendanceAPI, salaryAPI, advanceAPI } from '../services/api';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

const SalaryGeneratorModal = ({ onClose, onComplete }) => {
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [employees, setEmployees] = useState([]);
  const [hireData, setHireData] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [existingSalaries, setExistingSalaries] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [eRes, hRes, aRes, sRes, adRes] = await Promise.all([
        employeeAPI.get(),
        hireAPI.get(),
        attendanceAPI.get(),
        salaryAPI.get(),
        advanceAPI.get()
      ]);
      setEmployees((eRes.data || []).filter(e => e.status === 'Active'));
      setHireData(hRes.data || []);
      setAttendance(aRes.data || []);
      setExistingSalaries(sRes.data || []);
      setAdvances(adRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runCalculations = () => {
    setCalculating(true);
    
    // Parse month/year
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const parts = month.replace(',', '').split(' ');
    let targetMonth = -1;
    let targetYear = -1;

    parts.forEach(p => {
      const mIdx = monthNames.findIndex(m => p.toLowerCase().includes(m.toLowerCase()));
      if (mIdx !== -1) targetMonth = mIdx;
      if (p.match(/^\d{4}$/)) targetYear = parseInt(p);
    });

    if (targetMonth === -1 || targetYear === -1) {
      const d = new Date(month);
      if (!isNaN(d.getTime())) {
        targetMonth = d.getMonth();
        targetYear = d.getFullYear();
      }
    }

    if (targetMonth === -1 || targetYear === -1) {
      alert("Please enter a valid month (e.g. April 2026)");
      setCalculating(false);
      return;
    }

    const calculated = employees.map(emp => {
      // 1. Filter jobs
      const jobs = hireData.filter(h => {
        const d = new Date(h.date);
        const isMatch = (h.operatorName?.trim() === emp.name.trim()) && 
                        d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        return isMatch;
      });

      // 2. Filter attendance
      const workDays = attendance.filter(a => {
        const d = new Date(a.date);
        return a.employee?.trim() === emp.name.trim() && a.status === 'Present' && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      }).length;

      // 3. Calculation
      let hourlyEarnings = 0;
      let totalHours = 0;
      const shifts = [];

      totalHours = jobs.reduce((sum, j) => sum + (parseFloat(j.workingHours) || 0), 0);
      hourlyEarnings = totalHours * (emp.hourlyRate || 0);

      const uniqueHireDates = new Set(jobs.map(h => new Date(h.date).toDateString())).size;
      const effectiveWorkDays = Math.max(workDays, uniqueHireDates);
      const dailyAllowance = effectiveWorkDays * 500;
      const basic = emp.basicSalary || 0;

      // 4. Filter advances for this month/year
      const totalAdvance = advances.filter(ad => {
        const d = new Date(ad.date);
        return ad.employee?.trim() === emp.name.trim() && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      }).reduce((sum, ad) => sum + (parseFloat(ad.amount) || 0), 0);

      const netPay = basic + hourlyEarnings + dailyAllowance - totalAdvance;

      // 5. Check if already exists
      const exists = existingSalaries.some(s => s.employee === emp.name && s.month === month);

      return {
        employee: emp.name,
        month: month,
        role: emp.role,
        basic,
        hourlyEarnings,
        dailyAllowance,
        advance: totalAdvance,
        incentive: 0, // Default 0 for batch gen
        totalHours,
        jobsCount: jobs.length,
        workingDays: workDays,
        netPay,
        exists,
        details: jobs.map(j => ({ date: j.date, hours: j.workingHours, tool: j.toolId })),
        shifts
      };
    });

    setResults(calculated);
    setCalculating(false);
  };

  const handleSaveAll = async () => {
    const toSave = results.filter(r => !r.exists);
    if (toSave.length === 0) {
      alert("No new salary records to save (either already exist or no earnings).");
      return;
    }

    if (!window.confirm(`Save ${toSave.length} salary records for ${month}?`)) return;

    setSaving(true);
    try {
      for (const record of toSave) {
        await salaryAPI.create(record);
      }
      alert(`Successfully saved ${toSave.length} records!`);
      onComplete();
      onClose();
    } catch (err) {
      alert("Error saving some records. Check console.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className="form-group">
        <label>Select Target Month</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
            placeholder="e.g. April 2026"
            className="form-control"
          />
          <button 
            className="add-btn-batch" 
            onClick={runCalculations} 
            disabled={loading || calculating}
            style={{ margin: 0, padding: '10px 20px' }}
          >
            {calculating ? 'Calculating...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '20px' }}><RefreshCw className="spinner" /> Loading base data...</div>}

      {results.length > 0 && (
        <div style={{ marginTop: '20px', maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)' }}>
                <th style={{ padding: '10px' }}>Employee</th>
                <th style={{ padding: '10px' }}>Hours</th>
                <th style={{ padding: '10px' }}>Days</th>
                <th style={{ padding: '10px' }}>Earnings</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ opacity: r.exists ? 0.6 : 1 }}>
                  <td style={{ padding: '10px' }}>{r.employee}</td>
                  <td style={{ padding: '10px' }}>{r.totalHours}h ({r.jobsCount} jobs)</td>
                  <td style={{ padding: '10px' }}>{r.workingDays}d</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>LKR {r.netPay.toLocaleString()}</td>
                  <td style={{ padding: '10px' }}>
                    {r.exists ? (
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Exists
                      </span>
                    ) : r.netPay > 0 ? (
                      <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Ready</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>No Earnings</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button 
            className="add-btn" 
            onClick={handleSaveAll} 
            disabled={saving || !results.some(r => !r.exists)}
          >
            {saving ? 'Saving...' : 'Confirm & Save All'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SalaryGeneratorModal;
