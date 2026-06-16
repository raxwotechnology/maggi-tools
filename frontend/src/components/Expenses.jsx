import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { toolAPI, expenseAPI, accountAPI } from '../services/api';
import { Download, Search, RefreshCw, PlusCircle, TrendingDown, Filter, FileText, Trash2 } from 'lucide-react';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';
import ToolFilter from './ToolFilter';
import Autocomplete from './Autocomplete';
import '../styles/forms.css';
import '../styles/books.css';

const ExpenseForm = ({ onSubmit, onCancel, initialData, tools = [], categories = [] }) => {
  const [formData, setFormData] = React.useState(initialData || { date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', toolNo: '', note: '', paymentMethod: 'Cash', accountId: '' });
  const [accounts, setAccounts] = React.useState([]);

  React.useEffect(() => {
    fetchAccounts();
    if (initialData) {
      const formattedDate = initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setFormData({ ...initialData, date: formattedDate, toolNo: initialData.toolNo || initialData.vehicleNumber || initialData.vehicle || '', paymentMethod: initialData.paymentMethod || 'Cash', accountId: initialData.accountId || '' });
    }
  }, [initialData]);

  const fetchAccounts = async () => {
    try {
      const res = await accountAPI.get();
      setAccounts(res.data || []);
    } catch (e) { console.error(e); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <form className="hire-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="hire-form-scroll">
        <div className="form-section">
          <p className="form-section-title">Expense Details</p>
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
            <input type="text" required placeholder="e.g. Electricity bill, Repair cost" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="form-grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Category *</label>
              <Autocomplete
                name="category"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                options={categories.length > 0 ? categories : ['Repair & Maintenance', 'Fuel / Energy', 'Office Rent', 'Utility (Water/Elec)', 'Staff Welfare', 'Marketing', 'Other']}
                placeholder="e.g. Repair, Utility"
                required
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
              <label>{formData.paymentMethod === 'Cheque' ? 'Source Bank Account *' : 'Paying Bank Account *'}</label>
              <select required value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                <option value="">Select Account</option>
                {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.accountName} (LKR {acc.balance.toLocaleString()})</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Link to Tool (Optional)</label>
            <Autocomplete
              name="toolNo"
              value={formData.toolNo}
              onChange={handleChange}
              options={tools.map(v => v.number)}
              placeholder="Select tool ID"
            />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Detailed Notes</label>
            <textarea placeholder="Any additional details..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} rows={3} />
          </div>
        </div>
      </div>

      <div className="hire-form-footer">
        <div className="total-display">
          <span>Expense Amount</span>
          <strong style={{ color: '#EF4444' }}>LKR {parseFloat(formData.amount || 0).toLocaleString()}</strong>
        </div>
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="add-btn" style={{ background: '#EF4444' }}>{initialData ? 'Update Expense' : 'Add Expense'}</button>
        </div>
      </div>
    </form>
  );
};

const Expenses = () => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const canManage = ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [records, setRecords] = React.useState([]);
  const [tools, setTools] = React.useState([]);
  const [selectedTool, setSelectedTool] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [editingRecord, setEditingRecord] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().toISOString().slice(0, 7));

  const columns = canManage 
    ? ['DATE', 'TOOL', 'DESCRIPTION', 'CATEGORY', 'METHOD', 'AMOUNT (LKR)', 'ACTION']
    : ['DATE', 'TOOL', 'DESCRIPTION', 'CATEGORY', 'METHOD', 'AMOUNT (LKR)'];

  React.useEffect(() => { fetchRecords(); fetchTools(); }, []);

  const fetchTools = async () => {
    try {
      const res = await toolAPI.get();
      setTools(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await expenseAPI.get();
      const raw = Array.isArray(res.data) ? res.data : [];
      const formatted = raw.map(r => ({
        ...r,
        rawData: r,
        date_disp: r.date ? new Date(r.date).toLocaleDateString() : '—',
        amount_disp: (
          <span style={{ fontWeight: '600', color: '#EF4444' }}>
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
      const v = r.toolNo || r.vehicleNumber || r.vehicle;
      const matchMonth = !selectedMonth || r.date?.startsWith(selectedMonth);
      const matchV = !selectedTool || v === selectedTool;
      const matchS = !searchQuery || 
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchV && matchS;
    });
  }, [records, searchQuery, selectedTool, selectedMonth]);

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
        await expenseAPI.update(editingRecord._id, data);
        setSuccessMsg('Expense updated successfully!');
      } else {
        await expenseAPI.create(data);
        setSuccessMsg('Expense added successfully!');
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
    if (window.confirm('Delete this expense record?')) {
      try {
        await expenseAPI.delete(id);
        setSuccessMsg('Record deleted');
        fetchRecords();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) { console.error(err); }
    }
  };
  
  const handleExportPDF = () => {
    generateGenericReportPDF('Business Expense Report', ['DATE', 'TOOL', 'DESCRIPTION', 'CATEGORY', 'METHOD', 'AMOUNT'], filteredRecords);
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>EXPENSE RECORDS</label>
          <h3>{filteredRecords.length}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>TOTAL EXPENSES</label>
          <h3 style={{ color: '#EF4444' }}>LKR {totalAmount.toLocaleString()}</h3>
        </div>
      </div>

      <ToolFilter tools={tools} selectedTool={selectedTool} onSelect={setSelectedTool} />


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
              <PlusCircle size={18} /> <span>Add Expense</span>
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
          TOOL: r.toolNo || r.vehicleNumber || r.vehicle,
          DESCRIPTION: r.description,
          CATEGORY: r.category || '—',
          METHOD: r.paymentMethod || 'Cash',
          'AMOUNT (LKR)': r.amount_disp,
          ACTION: r.action
        }))} 
        loading={loading} 
        emptyMessage="No expense records found." 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }} 
        title={editingRecord ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm 
          onSubmit={handleAdd} 
          onCancel={() => { setIsModalOpen(false); setEditingRecord(null); }} 
          initialData={editingRecord}
          tools={tools}
          categories={categories}
        />
      </Modal>
    </div>
  );
};

export default Expenses;
