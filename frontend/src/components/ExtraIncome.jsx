import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { extraIncomeAPI, accountAPI } from '../services/api';
import { Download, Search, RefreshCw, PlusCircle, Wallet, Filter, FileText, Trash2 } from 'lucide-react';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';
import '../styles/books.css';

const ExtraIncomeForm = ({ onSubmit, onCancel, initialData, categories = [] }) => {
  const [formData, setFormData] = React.useState(initialData || { date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', note: '', paymentMethod: 'Cash', accountId: '' });
  const [accounts, setAccounts] = React.useState([]);

  React.useEffect(() => {
    fetchAccounts();
    if (initialData) {
      const formattedDate = initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setFormData({ ...initialData, date: formattedDate, paymentMethod: initialData.paymentMethod || 'Cash', accountId: initialData.accountId || '' });
    }
  }, [initialData]);

  const fetchAccounts = async () => {
    try {
      const res = await accountAPI.get();
      setAccounts(res.data || []);
    } catch (e) { console.error(e); }
  };
  
  return (
    <form className="hire-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="hire-form-scroll">
        <div className="form-section">
          <p className="form-section-title">Income Details</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Amount (LKR) *</label>
              <input type="number" required placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Description *</label>
            <input type="text" required placeholder="e.g. Spare parts sale" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Customer (Optional)</label>
            <input type="text" placeholder="e.g. John Doe" value={formData.client || ''} onChange={e => setFormData({...formData, client: e.target.value})} />
          </div>
          <div className="form-grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Category</label>
              <Autocomplete 
                name="category"
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                options={categories}
                placeholder="e.g. Service, Sales" 
              />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          {(formData.paymentMethod === 'Bank Transfer' || formData.paymentMethod === 'Cheque') && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Target Bank Account *</label>
              <select required value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                <option value="">Select Account</option>
                {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.accountName} (LKR {acc.balance.toLocaleString()})</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Notes</label>
            <textarea placeholder="Additional info..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} rows={3} />
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Income Amount</span>
          <strong>LKR {parseFloat(formData.amount || 0).toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="add-btn">{initialData ? 'Update Income' : 'Add Income'}</button>
        </div>
      </div>
    </form>
  );
};

const ExtraIncome = () => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRecord, setEditingRecord] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const columns = canManage 
    ? ['DATE', 'DESCRIPTION', 'CATEGORY', 'METHOD', 'AMOUNT (LKR)', 'ACTION']
    : ['DATE', 'DESCRIPTION', 'CATEGORY', 'METHOD', 'AMOUNT (LKR)'];

  React.useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await extraIncomeAPI.get();
      const raw = Array.isArray(res.data) ? res.data : [];
      const formatted = raw.map(r => ({
        ...r,
        rawData: r,
        date_disp: r.date ? new Date(r.date).toLocaleDateString() : '—',
        amount_disp: (
          <span style={{ fontWeight: '600', color: '#059669' }}>
            {parseFloat(r.amount || 0).toLocaleString()}
          </span>
        ),
        action: canManage ? (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            <button className="action-icon-btn btn-details" onClick={() => handleEdit(r)} title="Edit Record">
              <FileText />
            </button>
            <button className="action-icon-btn btn-delete" onClick={() => handleDelete(r._id)} title="Delete Record">
              <Trash2 />
            </button>
          </div>
        ) : null
      }));
      setRecords(formatted);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      const matchMonth = !selectedMonth || r.date?.startsWith(selectedMonth);
      const matchSearch = !searchQuery || 
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [records, searchQuery, selectedMonth]);

  const categories = React.useMemo(() => {
    const cats = records.map(r => r.category).filter(Boolean);
    return [...new Set(cats)];
  }, [records]);

  const totalAmount = React.useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [filteredRecords]);

  const handleAdd = async (data) => {
    try {
      if (editingRecord) {
        await extraIncomeAPI.update(editingRecord._id, data);
        setSuccessMsg('Income updated successfully!');
      } else {
        await extraIncomeAPI.create(data);
        setSuccessMsg('Income added successfully!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingRecord(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (record) => {
    setEditingRecord(record.rawData || record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this income record?')) {
      try {
        await extraIncomeAPI.delete(id);
        setSuccessMsg('Record deleted');
        fetchRecords();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) { console.error(err); }
    }
  };
  
  const handleExportPDF = () => {
    generateGenericReportPDF('Extra Income Report', ['DATE', 'DESCRIPTION', 'CATEGORY', 'METHOD', 'AMOUNT'], filteredRecords);
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>EXTRA INCOME RECORDS</label>
          <h3>{filteredRecords.length}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>TOTAL EXTRA INCOME</label>
          <h3 style={{ color: '#10B981' }}>LKR {totalAmount.toLocaleString()}</h3>
        </div>
      </div>

      <div className="book-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div className="search-box-unified" style={{ flex: 1, maxWidth: '400px' }}>
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search description, category..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <input 
            type="month" 
            className="date-filter"
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}>
              <PlusCircle size={18} /> <span>Add Income</span>
            </button>
          )}
          <button className="utility-icon-btn" onClick={fetchRecords} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          <button className="action-icon-btn btn-print" onClick={handleExportPDF} title="Download PDF">
            <Download size={18} />
          </button>
        </div>
      </div>
      
      {successMsg && <div className="success-banner" style={{ margin: '0 20px 20px' }}>{successMsg}</div>}
      
      <DataTable 
        columns={columns} 
        data={filteredRecords.map(r => ({
          ...r,
          DATE: r.date_disp,
          DESCRIPTION: r.description,
          CATEGORY: r.category || '—',
          METHOD: r.paymentMethod || 'Cash',
          'AMOUNT (LKR)': r.amount_disp,
          ACTION: r.action
        }))} 
        loading={loading} 
        emptyMessage="No income records found." 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }} 
        title={editingRecord ? 'Edit Extra Income' : 'Add Extra Income'}
      >
        <ExtraIncomeForm 
          onSubmit={handleAdd} 
          onCancel={() => { setIsModalOpen(false); setEditingRecord(null); }} 
          initialData={editingRecord}
          categories={categories}
        />
      </Modal>
    </div>
  );
};

export default ExtraIncome;
