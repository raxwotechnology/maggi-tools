import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import ClientForm from './ClientForm';
import { clientAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search, RefreshCw, PlusCircle, Users, CheckCircle, TrendingUp, Clock, UserCheck, Phone, AlertCircle, FileText, Trash2 } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import RecordDetails from './RecordDetails';

const Clients = () => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [clientRecords, setClientRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const columns = ['CUSTOMER NAME', 'NIC', 'CONTACT', 'TOTAL RENTALS', 'OUTSTANDING', 'STATUS', 'ACTION'];

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await clientAPI.get();
      const formatted = (response.data || []).map(item => ({
        ...item,
        rawData: item,
        'CUSTOMER NAME': <strong style={{ color: 'var(--text-main)' }}>{item.name || '—'}</strong>,
        'NIC': item.nic || '—',
        'CONTACT': <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} color="var(--text-dim)" /> {item.contact || '—'}</div>,
        'TOTAL RENTALS': <span className="status-badge status-confirmed" style={{ background: 'var(--bg-side)', color: 'var(--text-main)' }}>{item.totalHires || 0} Rentals</span>,
        'OUTSTANDING': <strong style={{ color: (item.outstanding || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>LKR {(item.outstanding || 0).toLocaleString()}</strong>,
        'STATUS': (
          <span className={`status-badge ${item.status === 'Active' ? 'status-completed' : 'status-cancelled'}`}>
            {item.status || 'Active'}
          </span>
        ),
        'ACTION': canManage ? (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            <button className="action-icon-btn btn-details" onClick={() => { setEditingItem(item); setIsModalOpen(true); }} title="Edit Client">
              <FileText />
            </button>
            <button className="action-icon-btn btn-delete" onClick={() => handleDelete(item._id)} title="Delete Client">
              <Trash2 />
            </button>
          </div>
        ) : null
      }));
      setClientRecords(formatted);
      setError(null);
    } catch (err) {
      console.error('RAXWO Clients: Fetch failed', err);
      setError('Could not load client records.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      try {
        await clientAPI.delete(id);
        fetchRecords();
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete client record.');
      }
    }
  };

  const filteredRecords = useMemo(() => {
    return clientRecords.filter(r => !searchQuery || (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.nic || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.contact || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [clientRecords, searchQuery]);

  const stats = useMemo(() => ({
    total: clientRecords.length,
    active: clientRecords.filter(c => c.status === 'Active').length,
    outstanding: clientRecords.reduce((sum, c) => sum + (c.outstanding || 0), 0)
  }), [clientRecords]);

  return (
    <div className="book-container">
      {/* ── Header ── */}
      <div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>Client Directory</h2>
        </div>
        <p className="header-subtitle">Customer Relations</p>
      </div>
      <div className="book-filters">
        <div className="bf-top-row">
          
           <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
             <Search className="search-icon" size={18} />
             <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>
            <button className="utility-icon-btn" onClick={fetchRecords} title="Refresh"><RefreshCw size={18} className={loading ? 'spinner' : ''} /></button>
          </div>
           
           {canManage && (
             <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ height: '48px', padding: '0 24px' }}>
               <PlusCircle size={18} /> Add Customer
             </button>
           )}
        
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="book-summary">
        <div className="summary-item">
          <label>Total Clients</label>
          <h3>{stats.total} Records</h3>
          <Users size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Active Accounts</label>
          <h3 style={{ color: 'var(--success)' }}>{stats.active} Active</h3>
          <UserCheck size={16} color="var(--success)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Net Outstanding</label>
          <h3 style={{ color: 'var(--danger)' }}>LKR {stats.outstanding.toLocaleString()}</h3>
          <TrendingUp size={16} color="var(--danger)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
      </div>

      {error && <div className="form-info-banner" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}><AlertCircle size={18} /> {error}</div>}

      <div className="compliance-card">
        <DataTable columns={columns} data={filteredRecords} loading={loading} onRowClick={(row) => { setSelectedRecord(row); setViewModalOpen(true); }} />
      </div>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Client Profile">
        <RecordDetails data={selectedRecord} type="client" />
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem ? 'Edit Customer' : 'Add New Customer'}>
        <ClientForm onSubmit={async (d) => { if (editingItem) await clientAPI.update(editingItem._id, d); else await clientAPI.create(d); setIsModalOpen(false); fetchRecords(); }} onCancel={() => setIsModalOpen(false)} initialData={editingItem} />
      </Modal>
    </div>
  );
};

export default Clients;
