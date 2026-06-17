import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from './DataTable';
import Modal from './Modal';
import RecordDetails from './RecordDetails';
import QuotationForm from './QuotationForm';
import { FileCheck, Plus, Download, Trash2, Search, RefreshCw, FileDown, PlusCircle, Printer, FileText, Eye } from 'lucide-react';
import { generateQuotationPDF } from '../utils/billingGenerator';
import { generatePDFReport } from '../utils/reportGenerator';
import '../styles/forms.css';
import '../styles/books.css';

const DEFAULT_TERMS = `1. Prices are exclusive of any taxes unless mentioned.
2. Payment must be made as per agreed terms.
3. We are not responsible for any delays due to site access issues.`;

const QuotationBook = () => {
  const [quotations, setQuotations] = useState([]);
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const userRole = localStorage.getItem('raxwo_user_role');
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchQuotations(); }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      const raw = Array.isArray(res.data) ? res.data : [];
      setQuotations(raw.map(quote => ({
        ...quote,
        rawData: quote,
        validity_disp: `${quote.validityDays || 30} Days`,
        total_disp: `LKR ${(quote.estimatedTotal || 0).toLocaleString()}`,
        status_disp: (
          <span className={`status-badge ${quote.status === 'Accepted' ? 'status-active' : quote.status === 'Cancelled' || quote.status === 'Rejected' ? 'status-inactive' : quote.status === 'Sent' ? 'status-pending' : ''}`}>
            {quote.status || 'Open'}
          </span>
        ),
        action: (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
             <button className="action-icon-btn btn-details" style={{ background: '#3b82f6', color:'#fff' }} onClick={() => handleRowClick(quote)} title="View Live Preview">
                <Eye />
             </button>
             <button className="action-icon-btn btn-print" onClick={() => generateQuotationPDF(quote)} title="Download PDF">
                <FileDown />
             </button>
             <button className="action-icon-btn btn-details" style={{ background: '#64748b', color:'#fff' }} onClick={() => generateQuotationPDF(quote, 'print')} title="Print Now">
                <Printer />
             </button>
            {canManage && (
              <button className="action-icon-btn btn-details" onClick={() => handleEdit(quote)} title="Edit Quotation">
                <FileText />
              </button>
            )}
            {canManage && (
              <button className="action-icon-btn btn-delete" onClick={() => handleDelete(quote._id)} title="Delete Quotation">
                <Trash2 />
              </button>
            )}
          </div>
        )
      })));
    } catch { alert('Error fetching quotations'); }
    finally { setLoading(false); }
  };

  const handleEdit = (item) => {
    const target = item.rawData || item;
    setEditingItem(target);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/quotations/${editingItem._id}`, data);
      } else {
        await api.post('/quotations', data);
      }
      setShowModal(false);
      setEditingItem(null);
      fetchQuotations();
    } catch { alert('Error saving quotation'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      await api.delete(`/quotations/${id}`);
      fetchQuotations();
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record.rawData || record);
    setIsDetailsOpen(true);
  };

  const handleExportFullReport = () => {
    const columns = ['QUOTE#', 'DATE', 'CUSTOMER', 'VALIDITY', 'EST. TOTAL', 'STATUS'];
    const data = filtered.map(q => [
      q.quotationNo || '—',
      new Date(q.date).toLocaleDateString(),
      q.clientName,
      `${q.validityDays} Days`,
      `Rs. ${q.estimatedTotal?.toLocaleString()}`,
      q.status
    ]);
    generatePDFReport({
      title: 'Quotations Summary Report',
      columns,
      data,
      filename: `Quotations_Report_${new Date().toISOString().split('T')[0]}.pdf`
    });
  };

  const filtered = quotations.filter(q =>
    (q.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.quotationNo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: quotations.length,
    activeCount: quotations.filter(q => ['Draft', 'Sent', 'Accepted'].includes(q.status)).length,
    totalPotentialRevenue: quotations.reduce((sum, q) => sum + (q.estimatedTotal || 0), 0)
  };

  return (
    <div className="book-container">
      
      <div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>Service Quotations</h2>
        </div>
        <p className="header-subtitle">Sales & Proposals</p>
      </div>
      <div className="book-filters">
        <div className="bf-top-row">
          
           <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
             <Search className="search-icon" size={18} />
             <input type="text" placeholder="Search quotes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
            <button className="utility-icon-btn" onClick={fetchQuotations} title="Refresh"><RefreshCw size={18} className={loading ? 'spinner' : ''} /></button>
          </div>
           
           {canManage && (
             <button className="add-btn" onClick={handleAddNew}>
               <PlusCircle size={18} /> New Quotation
             </button>
           )}
        
        </div>
      </div>

      <div className="book-summary">
        <div className="summary-item">
          <label>TOTAL QUOTES</label>
          <h3>{stats.total} Records</h3>
        </div>
        <div className="summary-item">
          <label>ACTIVE / OPEN</label>
          <h3 style={{ color: 'var(--warning)' }}>{stats.activeCount} Open</h3>
        </div>
        <div className="summary-item" style={{ borderRight: 'none' }}>
          <label>POTENTIAL REVENUE</label>
          <h3 style={{ color: 'var(--accent)' }}>LKR {stats.totalPotentialRevenue.toLocaleString()}</h3>
        </div>
      </div>

      <div className="compliance-card">
        <DataTable 
          columns={['QUOTE#', 'DATE', 'CUSTOMER', 'VALIDITY', 'EST. TOTAL', 'STATUS', 'ACTION']}
          data={filtered.map(q => ({
            'QUOTE#': q.quotationNo || '—',
            'DATE': new Date(q.date).toLocaleDateString(),
            'CUSTOMER': q.clientName || '—',
            'VALIDITY': q.validity_disp,
            'EST. TOTAL': <strong>{q.total_disp}</strong>,
            'STATUS': q.status_disp,
            'ACTION': q.action
          }))}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No quotations found."
        />
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setEditingItem(null); }} 
        title={editingItem ? "Edit Quotation" : "Generate New Quotation"}
      >
        <QuotationForm 
          onSubmit={handleSubmit} 
          onCancel={() => { setShowModal(false); setEditingItem(null); }} 
          initialData={editingItem} 
        />
      </Modal>

      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Quotation Live Preview" wide={true}>
        {selectedRecord && <RecordDetails data={selectedRecord} type="quotation" />}
      </Modal>

    </div>
  );
};

export default QuotationBook;
