import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import SalaryForm from './SalaryForm';
import { salaryAPI, toolAPI, employeeAPI, bookingAPI, attendanceAPI, advanceAPI } from '../services/api';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';
import { Download, Search, RefreshCw, Calendar, Users, Wallet, CreditCard, ChevronRight, TrendingUp, ShieldCheck, Clock, AlertCircle, PlusCircle, FileText, Trash2 } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';
import SalaryGeneratorModal from './SalaryGeneratorModal';
import AdvanceForm from './AdvanceForm';

const SalaryBook = () => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [activeTab, setActiveTab] = useState('Technician');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetMonth, setTargetMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));

  const [employees, setEmployees] = useState([]);
  const [hires, setHires] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [dbSalaries, setDbSalaries] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [tools, setTools] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [genModalOpen, setGenModalOpen] = useState(false);
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => { fetchBaseData(); }, [targetMonth]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [eRes, hRes, aRes, sRes, tRes, advRes] = await Promise.all([
        employeeAPI.get(), bookingAPI.get(), attendanceAPI.get(), salaryAPI.get(), toolAPI.get(), advanceAPI.get()
      ]);
      setEmployees((eRes.data || []).filter(e => e.status === 'Active'));
      setHires(hRes.data || []);
      setAttendance(aRes.data || []);
      setDbSalaries(sRes.data || []);
      setTools(tRes.data || []);
      setAdvances(advRes.data || []);
      setError(null);
    } catch (err) {
      console.error('RAXWO Payroll: Fetch failed', err);
      setError(`Connection issue: could not load payroll data.`);
    } finally {
      setLoading(false);
    }
  };

  const processedSalaries = useMemo(() => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const parts = targetMonth.replace(',', '').split(' ');
    let tMonthIdx = monthNames.findIndex(m => parts[0].toLowerCase().includes(m.toLowerCase()));
    let tYear = parseInt(parts[1]) || new Date().getFullYear();

    const filteredEmployees = employees.filter(e => e.role === activeTab);

    return filteredEmployees.map(emp => {
      const monthHires = hires.filter(h => {
        const d = new Date(h.pickupDate || h.date);
        return (d.getMonth() === tMonthIdx && d.getFullYear() === tYear) && (h.staffName?.trim() === emp.name.trim() || h.driverName?.trim() === emp.name.trim() || h.helperName?.trim() === emp.name.trim());
      });

      const empAtt = attendance.filter(a => {
        const d = new Date(a.date);
        return a.employee?.trim() === emp.name.trim() && a.status === 'Present' && d.getMonth() === tMonthIdx && d.getFullYear() === tYear;
      }).length;

      let basic = emp.basicSalary || 0;
      let hourlyEarnings = 0;
      let dailyAllowance = 0;
      let totalHours = 0;

      if (activeTab === 'Technician' || activeTab === 'Operator' || activeTab === 'Staff') {
        totalHours = monthHires.reduce((sum, j) => sum + (parseFloat(j.workingHours) || 0), 0);
        hourlyEarnings = totalHours * (emp.hourlyRate || 0);
        dailyAllowance = Math.max(empAtt, new Set(monthHires.map(h => new Date(h.date).toDateString())).size) * 500;
      }

      const empAdvances = advances.filter(a => a.employee === emp.name && a.month === targetMonth).reduce((sum, a) => sum + (a.amount || 0), 0);
      const dbRecord = dbSalaries.find(s => s.employee === emp.name && s.month === targetMonth);
      const netPay = (basic + hourlyEarnings + dailyAllowance) - empAdvances;

      return {
        _id: dbRecord ? dbRecord._id : `live-${emp.name}`,
        month: targetMonth,
        EMPLOYEE: <strong style={{ color: 'var(--text-main)' }}>{emp.name}</strong>,
        BASIC: <span style={{ fontWeight: 600 }}>LKR {basic.toLocaleString()}</span>,
        HOURLY: (activeTab === 'Technician' || activeTab === 'Operator' || activeTab === 'Staff') ? <span style={{ color: 'var(--accent)' }}>LKR {hourlyEarnings.toLocaleString()}</span> : '—',
        ALLOWANCE: (activeTab === 'Technician' || activeTab === 'Operator' || activeTab === 'Staff') ? <span style={{ color: 'var(--success)' }}>LKR {dailyAllowance.toLocaleString()}</span> : '—',
        HOURS: (activeTab === 'Technician' || activeTab === 'Operator' || activeTab === 'Staff') ? <span className="status-badge status-confirmed">{totalHours}h</span> : '—',
        'NET PAY': <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>LKR {netPay.toLocaleString()}</strong>,
        STATUS: (
          <span className={`status-badge ${dbRecord?.status === 'Paid' ? 'status-completed' : 'status-active'}`}>
            {dbRecord?.status || 'Pending'}
          </span>
        ),
        netPay_val: netPay,
        ACTION: canManage ? (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            <button className="action-icon-btn btn-details" onClick={() => handleEdit(dbRecord || { _id: `live-${emp.name}`, employee: emp.name, month: targetMonth, basic, hourlyEarnings, dailyAllowance, netPay })} title={dbRecord ? 'Edit Salary' : 'Finalize Salary'}>
               <FileText />
            </button>
          </div>
        ) : null
      };
    });
  }, [employees, hires, attendance, dbSalaries, advances, targetMonth, activeTab]);

  const stats = useMemo(() => {
    const total = processedSalaries.reduce((sum, r) => sum + (r.netPay_val || 0), 0);
    return { total, count: processedSalaries.length };
  }, [processedSalaries]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleExportPDF = () => {
    generateGenericReportPDF(`Payroll Report - ${targetMonth}`, ['EMPLOYEE', 'BASIC', 'HOURLY', 'ALLOWANCE', 'HOURS', 'NET PAY', 'STATUS'], processedSalaries);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = targetMonth.split(' ')[0];
  const currentYear = targetMonth.split(' ')[1];

  return (
    <div className="book-container">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Payroll &amp; Wages</p>
          <h1 style={{ margin: 0 }}>Staff Salary Book</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
          <div className="search-box" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 12px', height: '44px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)', minWidth: '0' }}>
            <Calendar size={18} className="search-icon" style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            <select value={currentMonth} onChange={e => setTargetMonth(`${e.target.value} ${currentYear}`)} style={{ border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', minWidth: '0' }}>
              {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={currentYear} onChange={e => setTargetMonth(`${currentMonth} ${e.target.value}`)} style={{ border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', minWidth: '0' }}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button className="utility-icon-btn" onClick={handleExportPDF} title="Download Payroll Report" style={{ height: '44px', width: '44px', minWidth: '44px', flexShrink: 0 }}>
            <Download size={18} />
          </button>
          <button className="utility-icon-btn" onClick={fetchBaseData} title="Refresh" style={{ height: '44px', width: '44px', minWidth: '44px', flexShrink: 0 }}>
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="form-info-banner" style={{ background: 'var(--danger)', color: '#fff', border: 'none', marginBottom: '24px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="form-info-banner" style={{ background: 'var(--success)', color: '#fff', border: 'none', marginBottom: '24px' }}>
          <ShieldCheck size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="book-summary">
        <div className="summary-item">
          <label>Projected Payroll</label>
          <h3>LKR {stats.total.toLocaleString()}</h3>
          <TrendingUp size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Active {activeTab}s</label>
          <h3 style={{ color: 'var(--success)' }}>{stats.count} Members</h3>
          <Users size={16} color="var(--success)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Monthly Advances</label>
          <h3 style={{ color: 'var(--warning)' }}>LKR {advances.filter(a => a.month === targetMonth).reduce((s, a) => s + a.amount, 0).toLocaleString()}</h3>
          <Wallet size={16} color="var(--warning)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
      </div>

      <div className="tab-switcher">
        {['Technician', 'Operator', 'Helper', 'Manager', 'Mechanic', 'Admin', 'Other'].map(tab => (
          <button key={tab} className={activeTab === tab ? 'active-tab' : ''} onClick={() => setActiveTab(tab)}>{tab.toUpperCase()}S</button>
        ))}
        <button className={activeTab === 'Advances' ? 'active-tab' : ''} onClick={() => setActiveTab('Advances')}>ADVANCES</button>
      </div>

      {activeTab !== 'Advances' ? (
        <div className="compliance-card">
           <DataTable 
             columns={['EMPLOYEE', 'BASIC', 'HOURLY', 'ALLOWANCE', 'HOURS', 'NET PAY', 'STATUS', 'ACTION']} 
             data={processedSalaries} 
             loading={loading}
             onRowClick={(r) => { setSelectedRecord(r); setViewModalOpen(true); }}
           />
        </div>
      ) : (
        <div className="compliance-content">
          <div className="book-filters" style={{ marginBottom: '24px' }}>
             <h3 style={{ margin: 0, fontWeight: 800 }}>Advance Records</h3>
             <button className="refresh-btn" onClick={() => setAdvanceModalOpen(true)}><PlusCircle size={18} /> Record Advance</button>
          </div>
          <div className="compliance-card">
            <DataTable 
               columns={['DATE', 'EMPLOYEE', 'AMOUNT', 'REMARKS', 'ACTION']}
               data={advances.filter(a => a.month === targetMonth).map(a => ({
                  ...a,
                  date: new Date(a.date).toLocaleDateString(),
                  amount: <strong style={{ color: 'var(--danger)' }}>LKR {a.amount.toLocaleString()}</strong>,
                  action: (
                    <div className="table-actions">
                      <button className="action-icon-btn btn-delete" onClick={async () => { if(window.confirm('Delete this advance?')) { await advanceAPI.delete(a._id); fetchBaseData(); } }} title="Delete Advance">
                        <Trash2 />
                      </button>
                    </div>
                  )
               }))}
            />
          </div>
        </div>
      )}

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Payroll Transaction Details">
        <RecordDetails data={selectedRecord} type="salary" />
      </Modal>

      <Modal isOpen={advanceModalOpen} onClose={() => setAdvanceModalOpen(false)} title="Record Salary Advance">
        <AdvanceForm employees={employees} currentMonth={targetMonth} onSubmit={async (d) => { await advanceAPI.create(d); setAdvanceModalOpen(false); fetchBaseData(); }} onCancel={() => setAdvanceModalOpen(false)} />
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem?._id?.startsWith('live') ? 'Finalize Salary' : 'Edit Salary'}>
        <SalaryForm 
          onSubmit={async (d) => { 
            try {
              if (editingItem?._id?.startsWith('live')) {
                await salaryAPI.create(d);
                setSuccess('Salary finalized successfully!');
              } else {
                await salaryAPI.update(editingItem._id, d);
                setSuccess('Salary record updated!');
              }
              setIsModalOpen(false); 
              fetchBaseData();
              setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
              console.error(err);
              alert('Failed to save salary record: ' + (err.response?.data?.message || err.message));
            }
          }} 
          onCancel={() => setIsModalOpen(false)} 
          initialData={editingItem} 
        />
      </Modal>
    </div>
  );
};

export default SalaryBook;
