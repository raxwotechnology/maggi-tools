import React, { useState, useEffect } from 'react';
import { accountAPI } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import { PlusCircle, RefreshCw, Wallet, CreditCard, Banknote, FileText, Trash2, TrendingUp } from 'lucide-react';
import '../styles/books.css';
import AccountLedger from './AccountLedger';

const Accounts = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ accountName: '', bankName: '', accountNumber: '', branch: '', balance: 0 });
  const [editingId, setEditingId] = useState(null);
  const [viewLedgerAccount, setViewLedgerAccount] = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await accountAPI.get();
      setRecords(res.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  if (viewLedgerAccount) {
    return <AccountLedger account={viewLedgerAccount} onBack={() => setViewLedgerAccount(null)} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await accountAPI.update(editingId, formData);
      else await accountAPI.create(formData);
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) { console.error(err); }
  };

  const columns = ['ACCOUNT NAME', 'BANK', 'ACCOUNT NO', 'BALANCE', 'ACTIONS'];
  const tableData = records.map(r => ({
    'ACCOUNT NAME': r.accountName || '—',
    'BANK': r.bankName || '—',
    'ACCOUNT NO': r.accountNumber || '—',
    'BALANCE': <strong>LKR {(r.balance || 0).toLocaleString()}</strong>,
    'ACTIONS': (
      <div className="table-actions">
        <button className="action-icon-btn btn-details" onClick={() => setViewLedgerAccount(r)} title="View Ledger">
          <TrendingUp />
        </button>
        <button className="action-icon-btn btn-print" onClick={() => { setEditingId(r._id); setFormData(r); setIsModalOpen(true); }} title="Edit Account">
          <FileText />
        </button>
        <button className="action-icon-btn btn-delete" onClick={() => handleDelete(r._id)} title="Delete Account">
          <Trash2 />
        </button>
      </div>
    )
  }));

  const handleDelete = async (id) => {
    if (window.confirm('Delete this bank account permanently?')) {
      try {
        await accountAPI.delete(id);
        fetchRecords();
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="book-container">
      <div className="dashboard-header">
        <div>
          <p className="form-text-dim" style={{ margin: 0 }}>Financial Management</p>
          <h1>Bank Accounts</h1>
        </div>
        <button className="add-btn" onClick={() => { setEditingId(null); setFormData({ accountName: '', bankName: '', accountNumber: '', branch: '', balance: 0 }); setIsModalOpen(true); }}>
          <PlusCircle size={18} /> Add Account
        </button>
      </div>

      <div className="book-summary">
        <div className="summary-item">
          <label>Total Balance</label>
          <h3 style={{ color: 'var(--success)' }}>LKR {records.reduce((sum, r) => sum + (r.balance || 0), 0).toLocaleString()}</h3>
          <Wallet size={16} className="summary-icon" />
        </div>
        <div className="summary-item">
          <label>Active Accounts</label>
          <h3>{records.length}</h3>
          <CreditCard size={16} className="summary-icon" />
        </div>
      </div>

      <DataTable columns={columns} data={tableData} loading={loading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Account' : 'Add New Account'}>
        <form onSubmit={handleSubmit} className="hire-form">
          <div className="form-section">
            <div className="form-group">
              <label>Account Display Name *</label>
              <input type="text" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} required placeholder="e.g. Main Business Account" />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Bank Name</label>
                <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="e.g. BOC / HNB" />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input type="text" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} placeholder="0012345678" />
              </div>
            </div>
            <div className="form-group">
              <label>Initial Balance</label>
              <input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: parseFloat(e.target.value)})} placeholder="0.00" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="submit-btn">Save Account</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Accounts;
