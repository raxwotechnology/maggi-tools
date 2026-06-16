import React, { useState, useEffect } from 'react';
import { toolAPI, markLeasePayment, renewToolDocument } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import { ShieldCheck, FileText, CreditCard, Calendar, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, ChevronRight, Wrench, Package } from 'lucide-react';
import '../styles/books.css';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ComplianceBook = () => {
  const now = new Date();
  const userRole = localStorage.getItem('raxwo_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [leasingYear, setLeasingYear] = useState(now.getFullYear());
  const [togglingId, setTogglingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [renewalModal, setRenewalModal] = useState({ isOpen: false, toolId: '', toolNumber: '', type: '', cost: '', newExpirationDate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('warranty');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await toolAPI.get();
      setTools(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('RAXWO Maintenance: Fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaseToggle = async (toolId, year, month, newPaid) => {
    const key = `${toolId}-${year}-${month}`;
    setTogglingId(key);
    setErrorMsg('');

    setTools(prev => prev.map(t => {
      if (t._id !== toolId) return t;
      const existing = (t.leasePayments || []);
      const idx = existing.findIndex(lp => Number(lp.year) === year && Number(lp.month) === month);
      let updated;
      if (idx >= 0) {
        updated = existing.map((lp, i) => i === idx ? { ...lp, paid: newPaid, paidDate: newPaid ? new Date().toISOString() : null } : lp);
      } else {
        updated = [...existing, { year, month, paid: newPaid, paidDate: newPaid ? new Date().toISOString() : null }];
      }
      return { ...t, leasePayments: updated };
    }));

    try {
      await markLeasePayment(toolId, year, month, newPaid);
      await fetchData();
    } catch (err) {
      await fetchData();
      setErrorMsg(err?.response?.data?.message || 'Failed to update lease payment');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRenewClick = (tool, type) => {
    let currentExpDate = '';
    if (type === 'warranty') currentExpDate = tool.warrantyExpirationDate;
    else if (type === 'nextService') currentExpDate = tool.nextServiceDate;
    else if (type === 'lastService') currentExpDate = tool.lastServiceDate;

    const baseDate = currentExpDate ? new Date(currentExpDate) : new Date();
    const nextYear = new Date(baseDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    setRenewalModal({
      isOpen: true,
      toolId: tool._id,
      toolNumber: tool.number,
      type,
      cost: '',
      newExpirationDate: nextYear.toISOString().split('T')[0]
    });
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await renewToolDocument(renewalModal.toolId, renewalModal.type, renewalModal.newExpirationDate, parseFloat(renewalModal.cost) || 0);
      setRenewalModal({ ...renewalModal, isOpen: false });
      await fetchData();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to renew record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-CA').replace(/-/g, '.');
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const expDate = new Date(date);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const fmt = (v) => `LKR ${(v || 0).toLocaleString()}`;

  const filteredTools = tools.filter(t => (t.number || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const tabs = [
    { id: 'warranty', label: 'Warranty', icon: ShieldCheck, color: '#2563EB' },
    { id: 'nextService', label: 'Next Service', icon: Wrench, color: '#10B981' },
    { id: 'lastService', label: 'Last Service', icon: Calendar, color: '#F59E0B' },
    { id: 'leasing', label: 'Leasing Plan', icon: CreditCard, color: '#8B5CF6' },
  ];

  const getDocData = (type) => {
    const field = type === 'warranty' ? 'warrantyExpirationDate' : type === 'nextService' ? 'nextServiceDate' : 'lastServiceDate';
    return [...filteredTools]
      .filter(t => t[field])
      .sort((a, b) => new Date(a[field]) - new Date(b[field]))
      .map(t => ({
        renewalDate: (
          <span style={{ fontWeight: 800, color: isExpiringSoon(t[field]) ? 'var(--danger)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {formatDate(t[field])}
            {isExpiringSoon(t[field]) && <AlertCircle size={14} />}
          </span>
        ),
        number: <strong style={{ color: 'var(--text-main)' }}>{t.number}</strong>,
        emi: <span style={{ color: 'var(--text-dim)' }}>{type === 'warranty' ? (t.warrantyEmiNumber || '—') : (t.financeEmiNumber || '—')}</span>,
        action: (
          <button onClick={() => handleRenewClick(t, type)} className="utility-icon-btn" style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}>
            <RefreshCw size={12} /> Update
          </button>
        )
      }));
  };

  // Group Leasing Tools by financeEmiNumber
  const leasingGroups = React.useMemo(() => {
    const groups = {};
    filteredTools.filter(t => t.hasLeasing).forEach(t => {
      const emi = t.financeEmiNumber || 'Individual Tools';
      if (!groups[emi]) groups[emi] = [];
      groups[emi].push(t);
    });
    return groups;
  }, [filteredTools]);

  return (
    <div className="book-container">
      {/* ── Header ── */}
      <div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>Tool Compliance</h2>
        </div>
        <p className="header-subtitle">Service & Maintenance</p>
      </div>
      <div className="book-filters">
        <div className="bf-top-row">
          
          <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
            <Search className="search-icon" size={18} />
            <input type="text" placeholder="Search tool..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
            <button className="utility-icon-btn" onClick={fetchData} title="Refresh Data">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          </div>
          
        
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="compliance-tabs">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`compliance-tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="form-info-banner" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Tab Content ── */}
      <div className="compliance-content">
        {activeTab !== 'leasing' ? (
          <div className="compliance-card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {tabs.find(t => t.id === activeTab).icon && React.createElement(tabs.find(t => t.id === activeTab).icon, { size: 24, color: tabs.find(t => t.id === activeTab).color })}
                <h3 style={{ textTransform: 'capitalize' }}>{activeTab === 'warranty' ? 'Warranty' : activeTab === 'nextService' ? 'Next Service' : 'Last Service'} Schedule</h3>
              </div>
              <span className="status-badge status-confirmed">{getDocData(activeTab).length} Tools</span>
            </div>
            <DataTable 
              columns={['DUE DATE', 'TOOL ID / SERIAL', 'EMI NO.', 'ACTION']}
              data={getDocData(activeTab).map(d => ({
                'DUE DATE': d.renewalDate,
                'TOOL ID / SERIAL': d.number,
                'EMI NO.': d.emi,
                'ACTION': d.action
              }))}
              loading={loading}
            />
          </div>
        ) : (
          <div className="compliance-card" style={{ border: 'none', background: 'transparent', boxShadow: 'none', overflow: 'visible' }}>
             {/* Year Selector */}
             <div className="book-filters" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <CreditCard size={24} color="#8B5CF6" />
                   <h3 style={{ margin: 0, fontWeight: 800 }}>Monthly Leasing Plan</h3>
                </div>
                <div className="filter-actions">
                  <select value={leasingYear} onChange={e => setLeasingYear(Number(e.target.value))}>
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
             </div>

             <div className="stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="summary-item">
                  <label>Selected Period</label>
                  <h3>{leasingYear}</h3>
                </div>
                <div className="summary-item">
                  <label>Tools on Lease</label>
                  <h3>{tools.filter(t => t.hasLeasing).length}</h3>
                </div>
             </div>

             {/* Leasing Grid */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
               {Object.entries(leasingGroups).map(([emi, groupTools]) => (
                  <div key={emi}>
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ margin: 0, color: 'var(--text-main)' }}>EMI Group: <span style={{ color: 'var(--accent)' }}>{emi}</span></h3>
                      <span className="status-badge" style={{ background: 'var(--bg-card)' }}>{groupTools.length} Tool{groupTools.length !== 1 && 's'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {groupTools.map(t => (
                        <div key={t._id} className="compliance-card" style={{ marginBottom: '0' }}>
                          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{t.number}</p>
                              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)' }}>{t.leasingCompany || 'Corporate Leasing'} · {fmt(t.monthlyPremium)}/mo</p>
                            </div>
                            <span className="status-badge status-confirmed">
                              {(t.leasePayments || []).filter(lp => lp.year === leasingYear && lp.paid).length}/12 Months Paid
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', padding: '24px' }}>
                            {MONTH_NAMES.map((m, idx) => {
                              const month = idx + 1;
                              const isFuture = leasingYear === now.getFullYear() && month > (now.getMonth() + 1);
                              const entry = (t.leasePayments || []).find(lp => lp.year === leasingYear && lp.month === month);
                              const isPaid = entry?.paid || false;
                              const toggling = togglingId === `${t._id}-${leasingYear}-${month}`;
                              
                              return (
                                <button key={m} disabled={isFuture || !canManage || toggling} onClick={() => handleLeaseToggle(t._id, leasingYear, month, !isPaid)}
                                  className={`leasing-month-btn ${isPaid ? 'paid' : 'unpaid'} ${isFuture ? 'future' : ''}`}
                                  style={{
                                    padding: '16px 8px', borderRadius: '16px', justifyContent: 'center', flexDirection: 'column', height: 'auto', gap: '6px',
                                    background: isFuture ? 'transparent' : isPaid ? 'var(--success-soft)' : 'var(--danger-soft)',
                                    color: isFuture ? 'var(--text-dim)' : isPaid ? 'var(--success)' : 'var(--danger)',
                                    border: isFuture ? '1px dashed var(--border)' : `1px solid ${isPaid ? 'var(--success-soft)' : 'var(--danger-soft)'}`,
                                    opacity: isFuture ? 0.4 : 1, transition: 'all 0.3s ease',
                                    cursor: isFuture ? 'default' : 'pointer'
                                  }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{m}</span>
                                  {isPaid ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* Renewal Modal */}
      <Modal isOpen={renewalModal.isOpen} onClose={() => setRenewalModal({ ...renewalModal, isOpen: false })} title={`Update ${renewalModal.type}`}>
        <form onSubmit={handleRenewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
           <div style={{ background: 'linear-gradient(145deg, var(--bg-card), var(--accent-soft))', padding: '20px', borderRadius: '16px', border: '1px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Target Asset</span>
                 <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginTop: '4px' }}>{renewalModal.toolNumber}</strong>
              </div>
              <div style={{ background: 'var(--bg-main)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                 <Package size={24} />
              </div>
           </div>

           <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-soft)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <div>
               <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '6px' }}>New {renewalModal.type} Date *</label>
               <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                  <input 
                     type="date" required 
                     value={renewalModal.newExpirationDate} 
                     onChange={e => setRenewalModal({ ...renewalModal, newExpirationDate: e.target.value })} 
                     style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                     onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                     onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
               </div>
             </div>

             <div>
               <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)', marginBottom: '6px' }}>Maintenance Cost (LKR)</label>
               <div style={{ position: 'relative' }}>
                  <CreditCard size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input 
                     type="number" placeholder="Enter Cost (Optional)" 
                     value={renewalModal.cost} 
                     onChange={e => setRenewalModal({ ...renewalModal, cost: e.target.value })} 
                     style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                     onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                     onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
               </div>
             </div>
           </div>

           <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
             <button type="button" onClick={() => setRenewalModal({ ...renewalModal, isOpen: false })} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => Object.assign(e.currentTarget.style, { background: '#e2e8f0', transform: 'translateY(-2px)' })} onMouseOut={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-main)', transform: 'none' })}>
                Cancel
             </button>
             <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent-glow))', color: '#fff', fontWeight: '800', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px var(--accent-soft)', transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1 }} onMouseOver={e => { if(!isSubmitting) Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: '0 6px 20px var(--accent-soft)' }) }} onMouseOut={e => { if(!isSubmitting) Object.assign(e.currentTarget.style, { transform: 'none', boxShadow: '0 4px 15px var(--accent-soft)' }) }}>
                {isSubmitting ? 'Processing Update...' : 'Confirm System Update'}
             </button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComplianceBook;
