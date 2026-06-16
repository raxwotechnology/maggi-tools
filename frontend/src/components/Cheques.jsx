import React, { useState, useEffect } from 'react';
import { chequeAPI, accountAPI } from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import { PlusCircle, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import '../styles/books.css';

const Cheques = () => {
  const [records, setRecords] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ chequeNumber: '', bank: '', amount: 0, dueDate: '', client: '', type: 'Incoming', status: 'Pending', accountId: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chequeRes, accountRes] = await Promise.all([chequeAPI.get(), accountAPI.get()]);
      setRecords(chequeRes.data || []);
      setAccounts(accountRes.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await chequeAPI.update(editingId, formData);
      else await chequeAPI.create(formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id, newStatus, accountId) => {
    if (newStatus === 'Accepted' && !accountId) {
      alert('Please select a bank account to deposit this cheque.');
      return;
    }
    try {
      await chequeAPI.update(id, { status: newStatus, accountId });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const columns = ['DATE', 'CHEQUE #', 'CLIENT', 'BANK', 'AMOUNT', 'TYPE', 'STATUS', 'ACTIONS'];
  const tableData = records.map(r => ({
    ...r,
    date: new Date(r.dueDate).toLocaleDateString(),
    amount_disp: <strong>LKR {(r.amount || 0).toLocaleString()}</strong>,
    type_disp: <span className={`status-badge ${r.type === 'Incoming' ? 'status-active' : 'status-pending'}`}>{r.type}</span>,
    status_disp: (
      <span className={`status-badge status-${r.status.toLowerCase()}`}>
        {r.status}
      </span>
    ),
    actions: (
      <div className="table-actions">
        {r.status === 'Pending' && (
          <>
            <select 
              className="status-select" 
              onChange={(e) => handleStatusChange(r._id, 'Accepted', e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Deposit to...</option>
              {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.accountName}</option>)}
            </select>
            <button className="delete-btn" onClick={() => handleStatusChange(r._id, 'Rejected')}>Reject</button>
          </>
        )}
        {r.status === 'Accepted' && (
           <button className="action-icon-btn btn-msg" onClick={() => handleStatusChange(r._id, 'Cleared', r.accountId)} title="Mark Cleared">
             <CheckCircle />
           </button>
        )}
      </div>
    )
  }));

  return (
    <div className="book-container">
      <div className="dashboard-header">
        <div>
          <p className="form-text-dim" style={{ margin: 0 }}>Financial Management</p>
          <h1>Cheque Ledger</h1>
        </div>
        <button className="add-btn" onClick={() => { setEditingId(null); setFormData({ chequeNumber: '', bank: '', amount: 0, dueDate: new Date().toISOString().split('T')[0], client: '', type: 'Incoming', status: 'Pending', accountId: '' }); setIsModalOpen(true); }}>
          <PlusCircle size={18} /> Record Cheque
        </button>
      </div>

      <div className="book-summary">
        <div className="summary-item">
          <label>Pending Incoming</label>
          <h3 style={{ color: 'var(--accent)' }}>LKR {records.filter(r => r.type === 'Incoming' && r.status === 'Pending').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</h3>
          <Clock size={16} className="summary-icon" />
        </div>
        <div className="summary-item">
          <label>Accepted/Cleared</label>
          <h3 style={{ color: 'var(--success)' }}>LKR {records.filter(r => r.status === 'Accepted' || r.status === 'Cleared').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</h3>
          <CheckCircle size={16} className="summary-icon" />
        </div>
      </div>

      <DataTable columns={columns} data={tableData} loading={loading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Cheque">
        <form onSubmit={handleSubmit} className="hire-form">
          <div className="form-section">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Cheque Number *</label>
                <input type="text" value={formData.chequeNumber} onChange={e => setFormData({...formData, chequeNumber: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Bank Name</label>
                <input type="text" value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} placeholder="e.g. BOC" />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Amount *</label>
                <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} required />
              </div>
            </div>
            <div className="form-group">
              <label>Client / Payee</label>
              <input type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Incoming">Incoming (From Customer)</option>
                <option value="Outgoing">Outgoing (To Supplier)</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="submit-btn">Save Cheque</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Cheques;
