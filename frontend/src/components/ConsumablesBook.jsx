import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import ConsumablesForm from './ConsumablesForm';
import { dieselAPI, toolAPI } from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { Download, Search, RefreshCw, PlusCircle, Fuel, Droplets, TrendingDown, Clock, Info, CheckCircle, AlertCircle, Package, FileText, Trash2 } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import ToolFilter from './ToolFilter';
import RecordDetails from './RecordDetails';

const FUEL_TYPES = ['All', 'Diesel', 'Petrol', 'Electricity', 'Service Parts', 'Other'];

const ConsumablesBook = () => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [consumableRecords, setConsumableRecords] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedFuelType, setSelectedFuelType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const columns = ['DATE', 'TOOL', 'TYPE', 'STAFF', 'QTY/UNITS', 'TOTAL COST', 'STATUS', 'ACTION'];

  useEffect(() => {
    fetchRecords();
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const res = await toolAPI.get();
      setTools(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this consumption log?')) return;
    try {
      await dieselAPI.delete(id);
      setSuccess('Entry deleted successfully!');
      fetchRecords();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Could not delete record.');
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await dieselAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      const formatted = rawData.map(item => ({
        ...item,
        rawData: item,
        date: new Date(item.date).toLocaleDateString(),
        tool_disp: <strong style={{ color: 'var(--text-main)' }}>{item.vehicle}</strong>,
        fuelType_disp: (
          <span className={`status-badge ${item.fuelType === 'Petrol' ? 'status-confirmed' : 'status-active'}`} style={item.fuelType === 'Petrol' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : {}}>
            {item.fuelType || 'Diesel'}
          </span>
        ),
        driver: item.employee || '—',
        liters_disp: <span style={{ fontWeight: 700 }}>{item.liters} Units</span>,
        totalCost: <strong style={{ color: 'var(--text-main)' }}>LKR {(item.total || 0).toLocaleString()}</strong>,
        status_disp: (
          <span className={`status-badge ${item.status === 'Verified' ? 'status-completed' : 'status-active'}`}>
            {item.status || 'Logged'}
          </span>
        ),
        action: (
          <div className="table-actions" onClick={e => e.stopPropagation()}>
            {canManage && (
              <button className="action-icon-btn btn-details" onClick={() => { setEditingItem(item); setIsModalOpen(true); }} title="Edit Record">
                <FileText />
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
      setConsumableRecords(formatted);
      setError(null);
    } catch (err) { setError('Connection issue: could not load consumption records.'); }
    finally { setLoading(false); }
  };

  const filteredRecords = useMemo(() => {
    return consumableRecords.filter(r => {
      const matchTool  = !selectedTool || r.rawData?.vehicle === selectedTool;
      const matchFuelType = selectedFuelType === 'All' || (r.rawData?.fuelType || 'Diesel') === selectedFuelType;
      const matchSearch   = !searchQuery || (r.employee || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.rawData?.vehicle || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchTool && matchFuelType && matchSearch;
    });
  }, [consumableRecords, selectedTool, selectedFuelType, searchQuery]);

  const stats = useMemo(() => {
    const totalLiters = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.rawData?.liters) || 0), 0);
    const totalCost   = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.rawData?.total) || 0), 0);
    const avgPrice    = totalLiters > 0 ? totalCost / totalLiters : 0;
    return { totalLiters, totalCost, avgPrice };
  }, [filteredRecords]);

  return (
    <div className="book-container">
      <div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>Tool Stock & Consumables</h2>
        </div>
        <p className="header-subtitle">Inventory & Operations</p>
      </div>
      <div className="book-filters">
        <div className="bf-top-row">
          
           <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
             <Search className="search-icon" size={18} />
             <input type="text" placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>
            <button className="utility-icon-btn" onClick={fetchRecords} title="Refresh"><RefreshCw size={18} className={loading ? 'spinner' : ''} /></button>
          </div>
           
           {canManage && (
             <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ height: '48px', padding: '0 24px' }}>
               <PlusCircle size={18} /> Add Entry
             </button>
           )}
        
        </div>
      </div>

      <div className="book-summary">
        <div className="summary-item">
          <label>Total Consumption</label>
          <h3>{stats.totalLiters.toFixed(1)} Units</h3>
          <Droplets size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Total Running Cost</label>
          <h3 style={{ color: 'var(--danger)' }}>LKR {stats.totalCost.toLocaleString()}</h3>
          <TrendingDown size={16} color="var(--danger)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Avg Price / Unit</label>
          <h3 style={{ color: 'var(--success)' }}>LKR {stats.avgPrice.toFixed(2)}</h3>
          <Info size={16} color="var(--success)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
      </div>

      <div className="book-filters">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div className="tab-switcher" style={{ margin: 0, flexShrink: 0 }}>
            {FUEL_TYPES.map(type => (
              <button key={type} className={selectedFuelType === type ? 'active-tab' : ''} onClick={() => setSelectedFuelType(type)}>
                {type}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ToolFilter tools={tools} selectedTool={selectedTool} onSelect={setSelectedTool} />
          </div>
        </div>
        <button className="action-icon-btn btn-print" onClick={() => {}} title="Export PDF" style={{ width: '48px', height: '48px' }}><Download size={18} /></button>
      </div>

      {success && <div className="form-info-banner" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}><CheckCircle size={18} /> {success}</div>}
      {error && <div className="form-info-banner" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}><AlertCircle size={18} /> {error}</div>}

      <div className="compliance-card">
        <DataTable columns={columns} data={filteredRecords.map(r => ({
          ...r,
          DATE: r.date,
          TOOL: r.tool_disp,
          TYPE: r.fuelType_disp,
          STAFF: r.driver,
          'QTY/UNITS': r.liters_disp,
          'TOTAL COST': r.totalCost,
          STATUS: r.status_disp,
          ACTION: r.action
        }))} loading={loading} onRowClick={(row) => { setSelectedRecord(row); setViewModalOpen(true); }} />
      </div>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Consumption Details">
        <RecordDetails data={selectedRecord} type="consumable" />
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} title={editingItem ? 'Edit Log' : 'Add Log'}>
        <ConsumablesForm onSubmit={async (d) => { if (editingItem) await dieselAPI.update(editingItem._id, d); else await dieselAPI.create(d); setIsModalOpen(false); fetchRecords(); }} onCancel={() => setIsModalOpen(false)} initialData={editingItem} />
      </Modal>
    </div>
  );
};

export default ConsumablesBook;
