const fs = require('fs');

const code = `import React, { useState, useEffect, useMemo } from 'react';
import { History, User, Calendar, Clock, ArrowRight, Filter, Search, Tag, Download, RefreshCw, Activity, ShieldCheck, Database, FileText, Zap } from 'lucide-react';
import { hireAPI, bookingAPI, invoiceAPI, extraIncomeAPI, expenseAPI } from '../services/api';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';
import DataTable from './DataTable';
import Modal from './Modal';
import RecordDetails from './RecordDetails';

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

      // Sort by updatedAt descending
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

  // Map data for DataTable
  const tableData = useMemo(() => {
    return filteredLogs.map(log => ({
      ...log,
      USER: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-glow))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.1rem', boxShadow: '0 4px 10px var(--accent-soft)' }}>
            {(log.updatedByName || log.operatorName || 'S')[0].toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>{log.updatedByName || log.operatorName || 'System'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{log.updatedBy ? 'Staff Member' : 'System Automation'}</span>
          </div>
        </div>
      ),
      'ACTION / RECORD': (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>Modified: <strong style={{ color: 'var(--accent)' }}>{log._ref}</strong></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', background: 'var(--bg-main)', border: '1px solid var(--border)', width: 'fit-content', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <FileText size={10} color="var(--accent)" />
            {log._type}
          </span>
        </div>
      ),
      TIMESTAMP: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600' }}><Calendar size={14} color="var(--accent)" /> {new Date(log.updatedAt || log.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: '500' }}><Clock size={14} /> {new Date(log.updatedAt || log.createdAt).toLocaleTimeString()}</span>
        </div>
      ),
      ACTION: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
           <button 
             onClick={() => setSelectedLog(log)} 
             style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.2s' }}
             onMouseOver={e => Object.assign(e.currentTarget.style, { background: 'var(--accent-soft)', borderColor: 'var(--accent)', transform: 'translateY(-2px)' })}
             onMouseOut={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-main)', borderColor: 'var(--border)', transform: 'none' })}
             title="View Detailed Log"
           >
              <ArrowRight size={18} />
           </button>
        </div>
      )
    }));
  }, [filteredLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px 0', animation: 'fadeIn 0.4s ease' }}>
      
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(145deg, var(--bg-card), var(--accent-soft))', padding: '24px 32px', borderRadius: '24px', border: '1px solid var(--accent-glow)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--accent), var(--accent-glow))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px var(--accent-soft)' }}>
            <ShieldCheck size={32} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Global Audit Trail</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: 'var(--text-dim)', fontWeight: '500' }}>Monitor and track all critical system modifications securely.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'var(--bg-main)', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border-soft)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={12} /> Total Records</span>
            <strong style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--accent)', marginTop: '2px' }}>{logs.length}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'var(--bg-main)', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border-soft)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={12} /> Active Users</span>
            <strong style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '2px' }}>{[...new Set(logs.map(l => l.updatedByName))].length}</strong>
          </div>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border-soft)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
          <input 
            type="text" 
            placeholder="Search by user or reference ID..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ position: 'relative', width: '220px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none', appearance: 'none', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="All">All Categories</option>
            <option value="Hire">Daily Hires</option>
            <option value="Booking">Bookings</option>
            <option value="Invoice">Invoices</option>
            <option value="Extra Income">Extra Income</option>
            <option value="Expense">Expenses</option>
          </select>
          <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-dim)' }}>▼</div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchLogs} 
            disabled={loading} 
            title="Refresh Data"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 24px', height: '52px', borderRadius: '14px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => Object.assign(e.currentTarget.style, { background: '#e2e8f0', transform: 'translateY(-2px)' })}
            onMouseOut={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-main)', transform: 'none' })}
          >
            <RefreshCw size={18} className={loading ? 'spinner' : ''} color="var(--accent)" />
            <span style={{ display: 'none' }} className="hide-on-mobile">Refresh</span>
          </button>

          <button 
            onClick={handleExportPDF} 
            title="Export Report"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 24px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent), var(--accent-glow))', border: 'none', color: '#fff', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px var(--accent-soft)', transition: 'all 0.2s' }}
            onMouseOver={e => Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: '0 6px 20px var(--accent-soft)' })}
            onMouseOut={e => Object.assign(e.currentTarget.style, { transform: 'none', boxShadow: '0 4px 15px var(--accent-soft)' })}
          >
            <Download size={18} />
            <span style={{ display: 'none' }} className="hide-on-mobile">Export</span>
          </button>
        </div>

      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-soft)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <DataTable 
          columns={['USER', 'ACTION / RECORD', 'TIMESTAMP', 'ACTION']}
          data={tableData}
          loading={loading}
        />
      </div>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Modification Details">
         <RecordDetails data={selectedLog} type={selectedLog?._type?.toLowerCase()} />
      </Modal>

      <style>{\`
        @media (min-width: 768px) {
           .hide-on-mobile {
             display: inline-flex !important;
           }
        }
      \`}</style>
    </div>
  );
};

export default AuditLog;
`;

fs.writeFileSync('frontend/src/components/AuditLog.jsx', code);
console.log('Replaced AuditLog.jsx');
