import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { toolAPI, markLeasePayment } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search, RefreshCw, PlusCircle, CheckCircle, XCircle, CreditCard, ChevronRight, Wrench, Info, AlertCircle, Package, Trash2, FileText, Plus } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';
import ToolForm from './ToolForm';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const LeasingBook = ({ tools, onPaymentToggle }) => {
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const leasingTools = tools.filter(t => t.rawData?.hasLeasing);

  if (leasingTools.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <CreditCard size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>No active leases found in the inventory.</p>
      </div>
    );
  }

  return (
    <div className="compliance-content">
      <div className="book-filters" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CreditCard size={24} color="var(--accent)" />
          <h3 style={{ margin: 0, fontWeight: 800 }}>Leasing Management</h3>
        </div>
        <div className="filter-actions">
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {leasingTools.map(t => {
          const rd = t.rawData || {};
          const payments = rd.leasePayments || [];
          return (
            <div key={t._id} className="stat-card" style={{ display: 'block', padding: 0 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-soft)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{rd.number}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>{rd.leasingCompany || 'Corporate Leasing'} · LKR {parseFloat(rd.monthlyPremium || 0).toLocaleString()}/mo</p>
                </div>
                <span className="status-badge status-confirmed">Due Day: {rd.leaseDueDate || '—'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', padding: '16px' }}>
                {MONTHS.map((m, idx) => {
                  const month = idx + 1;
                  const isPaid = (payments.find(lp => lp.year === selYear && lp.month === month))?.paid || false;
                  const isFuture = selYear === now.getFullYear() && month > (now.getMonth() + 1);
                  return (
                    <button key={m} disabled={isFuture} onClick={() => onPaymentToggle(rd._id, selYear, month, !isPaid)}
                      className={`nav-item ${isPaid ? 'active' : ''}`}
                      style={{
                        padding: '12px 8px', borderRadius: '12px', justifyContent: 'center', flexDirection: 'column', height: 'auto', gap: '4px',
                        background: isFuture ? 'transparent' : isPaid ? 'var(--success)' : 'var(--danger)',
                        color: isFuture ? 'var(--text-dim)' : '#fff',
                        opacity: isFuture ? 0.3 : 1, border: 'none', boxShadow: 'none'
                      }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{m}</span>
                      {isPaid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Tools = () => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [toolRecords, setToolRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

  const columns = ['TOOL ID / SERIAL', 'MODEL', 'CATEGORY', 'DAILY RATE', 'QUANTITY', 'STATUS', 'ACTION'];

  useEffect(() => { fetchTools(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tool? This will remove all its history.')) {
      try {
        await toolAPI.delete(id);
        fetchTools();
      } catch (err) { alert('Failed to delete tool.'); }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await toolAPI.update(id, { status: newStatus });
      fetchTools();
    } catch (err) { alert('Failed to update tool status.'); }
  };

  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await toolAPI.get();
      const raw = Array.isArray(res.data) ? res.data : [];
      const formatted = raw.map(t => ({
        ...t,
        rawData: t,
        'TOOL ID / SERIAL': <strong style={{ color: 'var(--text-main)' }}>{t.number || '—'}</strong>,
        'MODEL': t.model || '—',
        'CATEGORY': <span className="status-badge status-confirmed" style={{ background: 'var(--bg-side)', color: 'var(--text-main)' }}>{t.category}</span>,
        'DAILY RATE': <strong style={{ color: 'var(--accent)' }}>LKR {(t.dailyRate || 0).toLocaleString()}</strong>,
        'QUANTITY': (
          <span className="status-badge status-confirmed" style={{ background: 'var(--bg-side)', color: 'var(--text-main)', fontWeight: 800 }}>
            {t.stock ?? 1}
          </span>
        ),
        'STATUS': (
          <select
            value={t.status || 'Available'}
            onChange={e => handleStatusChange(t._id, e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              border: 'none',
              borderRadius: '8px',
              padding: '5px 10px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              background: t.status === 'Available' ? 'var(--success-soft)' : t.status === 'Booked' ? 'var(--accent-soft)' : t.status === 'Maintaining' ? '#fef9c3' : '#fee2e2',
              color: t.status === 'Available' ? 'var(--success)' : t.status === 'Booked' ? 'var(--accent)' : t.status === 'Maintaining' ? '#a16207' : 'var(--danger)'
            }}
          >
            <option value="Available">Available</option>
            <option value="Booked">Booked</option>
            <option value="Maintaining">Maintaining</option>
            <option value="Under Repair">Under Repair</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        ),
        'ACTION': (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            <button className="action-icon-btn btn-details" onClick={() => { setSelectedRecord(t); setIsModalOpen(true); }} title="Edit Tool">
              <FileText />
            </button>
            {canManage && (
              <button className="action-icon-btn btn-delete" onClick={() => handleDelete(t._id)} title="Delete Tool">
                <Trash2 />
              </button>
            )}
          </div>
        )
      }));
      setToolRecords(formatted);
    } catch (err) { console.error('Tools: Fetch failed', err); }
    finally { setLoading(false); }
  };

  const filteredRecords = useMemo(() => {
    return toolRecords.filter(r => !searchQuery || (r.rawData?.number || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.rawData?.model || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [toolRecords, searchQuery]);

  const handleExportPDF = () => {
    const exportColumns = ['ID', 'MODEL', 'CATEGORY', 'DAILY RATE', 'QUANTITY', 'STATUS'];
    const exportData = filteredRecords.map(t => [
      t.rawData.number,
      t.rawData.model,
      t.rawData.category,
      t.rawData.dailyRate,
      t.rawData.stock ?? 1,
      t.rawData.status
    ]);
    generatePDFReport({ title: 'Tool Inventory Report', columns: exportColumns, data: exportData, filename: `Inventory_Report.pdf` });
  };

  return (
    <div className="book-container">
      <div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <Wrench />
          <h2>Tool Inventory</h2>
        </div>
        <p className="header-subtitle">Manage tools, stock levels, and monitor leasing schedules.</p>
      </div>

      <div className="book-filters">
        <div className="bf-top-row">
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
            <Search className="search-icon" size={18} />
            <input type="text" placeholder="Search inventory by ID or Model..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
            <button className="utility-icon-btn" onClick={fetchTools} title="Refresh">
              <RefreshCw size={18} className={loading ? 'spinner' : ''} />
            </button>
          </div>
            
          </div>
          <div className="bf-action-btns">
            <button className="utility-icon-btn" onClick={handleExportPDF} title="Export PDF">
              <Download size={18} />
            </button>
            
            {canManage && (
              <button className="add-btn" onClick={() => { setSelectedRecord(null); setIsModalOpen(true); }}>
                <PlusCircle size={16} /> Add Tool
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="book-summary">
        <div className="summary-item">
          <label>Total Quantity</label>
          <h3>{toolRecords.reduce((s, t) => s + (t.rawData?.stock || 0), 0)}</h3>
          <Package size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Currently Booked</label>
          <h3 style={{ color: 'var(--accent)' }}>{toolRecords.filter(t => t.rawData?.status === 'Booked').length}</h3>
          <AlertCircle size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Available Now</label>
          <h3 style={{ color: 'var(--success)' }}>{toolRecords.reduce((s, t) => s + (t.rawData?.status === 'Available' ? (t.rawData?.stock || 1) : 0), 0)}</h3>
          <CheckCircle size={16} color="var(--success)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
      </div>

      <div className="tab-switcher">
        <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? 'active-tab' : ''}>Tool List</button>
        <button onClick={() => setActiveTab('leasing')} className={activeTab === 'leasing' ? 'active-tab' : ''}>Leasing Book</button>
      </div>

      {activeTab === 'inventory' ? (
        <div className="compliance-card">
          <DataTable columns={columns} data={filteredRecords} loading={loading} onRowClick={(row) => { setSelectedRecord(row); setViewModalOpen(true); }} />
        </div>
      ) : (
        <LeasingBook tools={toolRecords} onPaymentToggle={async (id, y, m, p) => { await markLeasePayment(id, y, m, p); fetchTools(); }} />
      )}

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Tool Profile">
        <RecordDetails data={selectedRecord?.rawData || selectedRecord} type="tool" />
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedRecord(null); }} title={selectedRecord ? 'Edit Tool' : 'Register Tool'}>
        <ToolForm 
          initialData={selectedRecord} 
          onCancel={() => { setIsModalOpen(false); setSelectedRecord(null); }} 
          onSubmit={() => { fetchTools(); setIsModalOpen(false); setSelectedRecord(null); }} 
        />
      </Modal>
    </div>
  );
};

export default Tools;
