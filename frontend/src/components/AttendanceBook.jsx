import React, { useState, useEffect } from 'react';
import { attendanceAPI, employeeAPI } from '../services/api';
import { Calendar, CheckCircle, XCircle, Clock, RefreshCw, Users, ShieldCheck, UserMinus, UserCheck } from 'lucide-react';
import '../styles/books.css';

const AttendanceBook = () => {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => { fetchData(); }, [date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, aRes] = await Promise.all([
        employeeAPI.get(),
        attendanceAPI.get({ date })
      ]);
      setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
      const dayRecords = (Array.isArray(aRes.data) ? aRes.data : []).filter(r => {
          return new Date(r.date).toISOString().split('T')[0] === date;
      });
      setAttendance(dayRecords);
    } catch (err) { console.error('RAXWO Attendance: Fetch failed', err); }
    finally { setLoading(false); }
  };

  const handleMark = async (employeeName, status) => {
    try {
      await attendanceAPI.create({ employee: employeeName, date: date, status: status });
      setSuccess(`Marked ${employeeName} as ${status}`);
      fetchData();
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) { console.error(err); }
  };

  const getStatus = (name) => {
    const record = attendance.find(a => a.employee === name);
    return record ? record.status : 'None';
  };

  return (
    <div className="book-container">
      {/* ── Header ── */}
      <div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>Daily Attendance</h2>
        </div>
        <p className="header-subtitle">Staff Operations</p>
      </div>
      <div className="book-filters">
        <div className="bf-top-row">
          
           <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
             <Calendar size={18} className="search-icon" />
             <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer' }} />
           </div>
            <button className="utility-icon-btn" onClick={fetchData} title="Refresh"><RefreshCw size={18} className={loading ? 'spinner' : ''} /></button>
          </div>
           
        
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="book-summary">
        <div className="summary-item">
          <label>Active Force</label>
          <h3>{employees.filter(e => e.status === 'Active').length} Members</h3>
          <Users size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Present Today</label>
          <h3 style={{ color: 'var(--success)' }}>{attendance.filter(a => a.status === 'Present').length} On-Duty</h3>
          <UserCheck size={16} color="var(--success)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Absence Rate</label>
          <h3 style={{ color: 'var(--danger)' }}>{attendance.filter(a => a.status === 'Absent').length} Off-Duty</h3>
          <UserMinus size={16} color="var(--danger)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
      </div>

      {success && <div className="form-info-banner" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}><ShieldCheck size={18} /> {success}</div>}

      <div className="attendance-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', marginTop: '24px' }}>
        {employees.filter(e => e.status === 'Active').map(emp => {
          const status = getStatus(emp.name);
          return (
            <div key={emp._id} className="summary-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '2px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{emp.role}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button 
                  onClick={() => handleMark(emp.name, 'Present')}
                  className={`action-icon-btn btn-msg ${status === 'Present' ? 'active' : ''}`}
                  style={status === 'Present' ? { background: 'var(--success) !important', color: '#fff !important' } : {}}
                  title="Mark Present"
                >
                  <CheckCircle />
                </button>
                <button 
                  onClick={() => handleMark(emp.name, 'Absent')}
                  className={`action-icon-btn btn-delete ${status === 'Absent' ? 'active' : ''}`}
                  style={status === 'Absent' ? { background: 'var(--danger) !important', color: '#fff !important' } : {}}
                  title="Mark Absent"
                >
                  <XCircle />
                </button>
                <button 
                  onClick={() => handleMark(emp.name, 'Leave')}
                  className={`action-icon-btn btn-bell ${status === 'Leave' ? 'active' : ''}`}
                  style={status === 'Leave' ? { background: 'var(--warning) !important', color: '#fff !important' } : {}}
                  title="Mark Leave"
                >
                  <Clock />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default AttendanceBook;
