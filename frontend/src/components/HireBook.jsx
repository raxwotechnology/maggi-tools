import React from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import HireForm from './HireForm';
import RecordDetails from './RecordDetails';
import { hireAPI, toolAPI } from '../services/api';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';
import { Download, Search, PlusCircle, RefreshCw, Package } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import ToolFilter from './ToolFilter';

const HireBook = () => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  
  const [hireRecords, setHireRecords] = React.useState([]);
  const [tools, setTools] = React.useState([]);
  const [selectedTool, setSelectedTool] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const tableColumns = ['DATE', 'BILL#', 'CUSTOMER', 'TOOL', 'CITY', 'TOTAL', 'STATUS', 'ACTION'];
  
  React.useEffect(() => {
    fetchRecords();
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const res = await toolAPI.get();
      setTools(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await hireAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      const formatted = rawData.map(item => ({
        ...item,
        rawData:    item,
        'DATE':     new Date(item.date).toLocaleDateString(),
        'BILL#':    item.billNumber || '—',
        'CUSTOMER': item.client || '—',
        'TOOL':     item.toolId || '—',
        'CITY':     item.city || item.location || '—',
        'TOTAL':    <strong>LKR {(item.totalAmount || 0).toLocaleString()}</strong>,
        'STATUS': (
          <span className={`status-badge ${item.status === 'Completed' || item.status === 'Returned' ? 'status-active' : 'status-pending'}`}>
            {item.status || 'Pending'}
          </span>
        ),
        'ACTION': (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            {canManage && (
              <button className="action-icon-btn btn-details" onClick={() => handleEdit(item)} title="Edit Record">
                <FileText />
              </button>
            )}
            {canManage && (
              <button className="action-icon-btn btn-print" onClick={() => handleDuplicate(item)} title="Duplicate Record">
                <PlusCircle />
              </button>
            )}
            {canManage && (
              <button className="action-icon-btn btn-delete" onClick={() => handleDelete(item._id)} title="Delete Record">
                <Trash2 />
              </button>
            )}
          </div>
        )
      }));
      setHireRecords(formatted);
      setError(null);
    } catch (err) {
      console.error('Fetch Rentals Error:', err);
      setError('Connection issue: could not load rental records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    return hireRecords.filter(r => {
      const matchTool = !selectedTool || r.tool === selectedTool;
      const matchSearch = !searchQuery || 
        r.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.timeSheetNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTool && matchSearch;
    });
  }, [hireRecords, selectedTool, searchQuery]);

  const stats = React.useMemo(() => {
    const totalJobs    = filteredRecords.length;
    const totalRevenue = filteredRecords.reduce((sum, r) => sum + (r.billAmount_val || 0), 0);
    const totalAmount  = filteredRecords.reduce((sum, r) => sum + (r.totalAmount_val || 0), 0);
    return { totalJobs, totalRevenue, totalAmount };
  }, [filteredRecords]);

  const handleAddJob = async (data) => {
    try {
      if (editingItem && editingItem._id) {
        await hireAPI.update(editingItem._id, data);
        setSuccess('Rental record updated!');
      } else {
        await hireAPI.create(data);
        setSuccess('New rental entry added!');
      }
      fetchRecords();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving rental details.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (item) => {
    const target = item.rawData || item;
    setEditingItem(target);
    setIsModalOpen(true);
  };

  const handleDuplicate = (item) => {
    const target = item.rawData || item;
    const { _id, createdAt, updatedAt, __v, ...rest } = target;
    setEditingItem(rest);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this rental record?')) {
      try {
        await hireAPI.delete(id);
        setSuccess('Record deleted.');
        fetchRecords();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Could not delete record.');
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const handleExportPDF = () => {
    generateGenericReportPDF('Daily Rental Report', ['DATE', 'BILL#', 'CUSTOMER', 'TOOL', 'CITY', 'TOTAL', 'STATUS'], filteredRecords);
  };

  return (
    <div className="book-container">
      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL RENTALS</label>
          <h3>{stats.totalJobs}</h3>
        </div>
        <div className="summary-item">
          <label>TOTAL BILL AMT</label>
          <h3 style={{ color: '#2563EB' }}>LKR {stats.totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>NET TOTAL</label>
          <h3 style={{ color: '#10B981' }}>LKR {stats.totalAmount.toLocaleString()}</h3>
        </div>
      </div>

      <ToolFilter 
        tools={tools} 
        selectedTool={selectedTool} 
        onSelect={setSelectedTool} 
      />

      <div className="book-filters">
        <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
          <Search className="search-icon" size={20} style={{ minWidth: '20px' }} />
          <input 
            type="text" 
            placeholder="Search customer, bill, city, address..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
            <button className="utility-icon-btn" onClick={fetchRecords} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          </div>
        <div className="filter-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          
          <button className="action-icon-btn btn-print" onClick={handleExportPDF} title="Export PDF">
            <Download size={18} />
          </button>
          {canManage && (
            <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
              <PlusCircle size={18} /> <span>Add Rental</span>
            </button>
          )}
        </div>
      </div>

      {success && <div className="success-banner">{success}</div>}
      {error && <div className="error-banner">{error}</div>}

      <DataTable 
        columns={tableColumns} 
        data={filteredRecords} 
        loading={loading}
        onRowClick={handleRowClick}
        emptyMessage={loading ? "Connecting..." : "No rental records found."} 
      />

      <Modal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        title="Rental Details"
        wide
      >
        <RecordDetails data={selectedRecord} type="hire" />
        <div className="modal-footer" style={{ padding: '15px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-main)' }}>
            <button className="secondary-btn" onClick={() => setViewModalOpen(false)}>Close</button>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        title={editingItem && editingItem._id ? 'Edit Rental' : 'Add Rental Record'}
        wide
      >
        <HireForm 
          onSubmit={handleAddJob} 
          onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} 
          initialData={editingItem}
        />
      </Modal>
    </div>
  );
};

export default HireBook;
