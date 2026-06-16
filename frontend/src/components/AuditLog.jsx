import React, { useState, useEffect, useMemo } from 'react';
import { History, User, Calendar, Clock, ArrowRight, Filter, Search, Tag, Download, RefreshCw, Activity, ShieldCheck, Database, FileText, Zap } from 'lucide-react';
import { hireAPI, bookingAPI, invoiceAPI, extraIncomeAPI, expenseAPI } from '../services/api';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';
import DataTable from './DataTable';
import Modal from './Modal';
import RecordDetails from './RecordDetails';
import '../styles/books.css';
import '../styles/audit.css';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [h, b, i, ei, ex] = await Promise.all([
        hireAPI.get(),
        bookingAPI.get(),
        invoiceAPI.get(),
        extraIncomeAPI.get(),
        expenseAPI.get()
      ]);

      const allLogs = [
        ...(h.data || []).map(x => ({ ...x, _type: 'Hire', _ref: x.billNumber })),
        ...(b.data || []).map(x => ({ ...x, _type: 'Booking', _ref: x.bookingId })),
        ...(i.data || []).map(x => ({ ...x, _type: 'Invoice', _ref: x.invoiceNo })),
        ...(ei.data || []).map(x => ({ ...x, _type: 'Extra Income', _ref: x.description })),
        ...(ex.data || []).map(x => ({ ...x, _type: 'Expense', _ref: x.description }))
      ];

      allLogs.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      setLogs(allLogs);
    } catch (err) {
      console.error('Audit fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    generateGenericReportPDF('Global Audit Log Report', ['USER', 'RECORD TYPE', 'REFERENCE', 'DATE', 'TIME'], filteredLogs.map(l => ({
        ...l,
        user: l.updatedByName || l.operatorName || 'System',
        recordtype: l._type,
        reference: l._ref,
        date: new Date(l.updatedAt || l.createdAt).toLocaleDateString(),
        time: new Date(l.updatedAt || l.createdAt).toLocaleTimeString()
    })));
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = (log.updatedByName || log.operatorName || '').toLowerCase().includes(filter.toLowerCase()) ||
                            (log._ref || '').toLowerCase().includes(filter.toLowerCase());
      const matchesType = typeFilter === 'All' || log._type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [logs, filter, typeFilter]);

  const tableData = useMemo(() => {
    return filteredLogs.map(log => ({
      ...log,
      USER: (
        <div className="audit-user-cell">
          <div className="audit-avatar">{(log.updatedByName || log.operatorName || 'S')[0].toUpperCase()}</div>
          <div>
            <p className="audit-username">{log.updatedByName || log.operatorName || 'System'}</p>
            <p className="audit-role">{log.updatedBy ? 'Staff Member' : 'System Automation'}</p>
          </div>
        </div>
      ),
      'ACTION / RECORD': (
        <div className="audit-action-cell">
          <div>
            <p className="audit-ref">Modified: <strong>{log._ref}</strong></p>
            <span className={`audit-badge badge-${log._type.replace(/\s+/g, '-').toLowerCase()}`}>
              {log._type}
            </span>
          </div>
        </div>
      ),
      TIMESTAMP: (
        <div className="audit-time-cell">
          <p className="audit-date"><Calendar size={12} /> {new Date(log.updatedAt || log.createdAt).toLocaleDateString()}</p>
          <p className="audit-time"><Clock size={12} /> {new Date(log.updatedAt || log.createdAt).toLocaleTimeString()}</p>
        </div>
      ),
      ACTION: (
        <div className="table-actions" onClick={e => e.stopPropagation()}>
           <button className="action-icon-btn btn-details" onClick={() => setSelectedLog(log)} title="View Details">
              <ArrowRight />
           </button>
        </div>
      )
    }));
  }, [filteredLogs]);

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL RECORDS</label>
          <h3>{logs.length}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>ACTIVE USERS</label>
          <h3 style={{ color: 'var(--accent)' }}>{[...new Set(logs.map(l => l.updatedByName))].length}</h3>
        </div>
      </div>

      <div className="book-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div className="search-box-unified" style={{ flex: 1, maxWidth: '400px' }}>
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search by user or reference ID..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative', width: '220px' }}>
            <Filter size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.9rem', color: 'var(--text-main)', outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Categories</option>
              <option value="Hire">Daily Hires</option>
              <option value="Booking">Bookings</option>
              <option value="Invoice">Invoices</option>
              <option value="Extra Income">Extra Income</option>
              <option value="Expense">Expenses</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
          <button className="utility-icon-btn" onClick={fetchLogs} title="Refresh" style={{ height: '44px', width: '44px' }}>
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          <button 
            className="add-btn btn-glow" 
            onClick={handleExportPDF} 
            title="Export PDF Report"
            style={{ 
              height: '44px', 
              padding: '0 20px', 
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 'var(--r-md)', 
              fontWeight: '800', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              boxShadow: '0 4px 14px var(--accent-soft)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <DataTable 
        columns={['USER', 'ACTION / RECORD', 'TIMESTAMP', 'ACTION']}
        data={tableData}
        loading={loading}
        onRowClick={(log) => setSelectedLog(log)}
      />

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Modification Details">
         <RecordDetails data={selectedLog} type={selectedLog?._type?.toLowerCase()} />
      </Modal>
    </div>
  );
};

export default AuditLog;
