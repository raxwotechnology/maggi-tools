import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './DataTable';
import Modal from './Modal';
import { accessoryAPI } from '../services/api';
import { Package, PlusCircle, Search, RefreshCw, Trash2, FileText, Hash } from 'lucide-react';
import Autocomplete from './Autocomplete';
import '../styles/books.css';

const Accessories = () => {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData]     = useState({
    number: '', name: '', category: '', price: '', stock: '', unit: 'pcs', description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await accessoryAPI.get();
      setItems(res.data || []);
    } catch (err) {
      alert('Failed to load accessories: ' + (err.response?.data?.message || err.message));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this accessory?')) {
      try {
        await accessoryAPI.delete(id);
        fetchData();
      } catch (err) { alert('Delete failed: ' + (err.response?.data?.message || err.message)); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.number?.trim()) { alert('Accessory ID is required.'); return; }
    try {
      if (editingItem) {
        await accessoryAPI.update(editingItem._id, formData);
      } else {
        await accessoryAPI.create(formData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ number: '', name: '', category: '', price: '', stock: '', unit: 'pcs', description: '' });
      fetchData();
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.message || err.message));
    }
  };

  /* Search by ID, name, or category */
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      (i.number || '').toLowerCase().includes(q) ||
      (i.name   || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const columns = ['ACC. ID', 'NAME', 'CATEGORY', 'STOCK', 'PRICE', 'ACTION'];

  return (
    <div className="book-container">
      {/* ── Summary ── */}
      <div className="book-summary">
        <div className="summary-item">
          <label>Total Quantity</label>
          <h3>{items.reduce((s, i) => s + (i.stock || 0), 0)}</h3>
          <Package size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Low Stock Items</label>
          <h3 style={{ color: 'var(--danger)' }}>{items.filter(i => i.stock < 5).length}</h3>
        </div>
        <div className="summary-item">
          <label>Total Item Types</label>
          <h3>{items.length}</h3>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="book-filters">
        <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by ID, name or category…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
            <button className="utility-icon-btn" onClick={fetchData} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          </div>
        <div className="filter-actions">
          
          <button className="add-btn" onClick={() => {
            setEditingItem(null);
            setFormData({ number: '', name: '', category: '', price: '', stock: '', unit: 'pcs', description: '' });
            setIsModalOpen(true);
          }}>
            <PlusCircle size={18} /> Add Accessory
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="compliance-card">
        <DataTable
          columns={columns}
          data={filteredItems.map(i => ({
            'ACC. ID':  <strong style={{ color: 'var(--accent)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{i.number || '—'}</strong>,
            'NAME':     <strong>{i.name}</strong>,
            'CATEGORY': i.category || '—',
            'STOCK':    <span style={{ color: i.stock < 5 ? 'var(--danger)' : 'var(--text-main)', fontWeight: 700 }}>{i.stock} {i.unit}</span>,
            'PRICE':    `LKR ${(i.price || 0).toLocaleString()}`,
            'ACTION': (
              <div className="table-actions" onClick={e => e.stopPropagation()}>
                <button className="action-icon-btn btn-details" onClick={() => handleEdit(i)} title="Edit Accessory">
                  <FileText />
                </button>
                <button className="action-icon-btn btn-delete" onClick={() => handleDelete(i._id)} title="Delete Accessory">
                  <Trash2 />
                </button>
              </div>
            )
          }))}
          loading={loading}
        />
      </div>

      {/* ── Form Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Accessory' : 'New Accessory'}>
        <form onSubmit={handleSubmit} className="hire-form" style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>

          {/* Accessory ID */}
          <div className="form-group">
            <label>Accessory ID *</label>
            <div className="select-wrapper">
              <Hash className="input-icon-left" size={16} />
              <input
                style={{ paddingLeft: '40px' }}
                type="text"
                required
                placeholder="e.g. ACC-001 (must be unique)"
                value={formData.number || ''}
                onChange={e => setFormData({ ...formData, number: e.target.value.toUpperCase() })}
                disabled={!!(editingItem && editingItem.number)}   /* ID locked after it has been set */
              />
            </div>
            {editingItem && editingItem.number && <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Accessory ID cannot be changed once set.</small>}

          </div>

          <div className="form-group">
            <label>Accessory Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Category</label>
              <Autocomplete
                name="category"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                options={[...new Set(items.map(i => i.category).filter(Boolean))]}
                placeholder="e.g. Drill Bits"
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="pcs, kg, etc." />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Price (LKR) *</label>
              <input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Current Stock *</label>
              <input type="number" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
          </div>

          <div className="form-group">
             <label>Custom Overdue Rate / Day (LKR)</label>
             <input type="number" min="0" placeholder="Optional (overrides default)" value={formData.customOverdueChargePerDay ?? ''} onChange={e => setFormData({ ...formData, customOverdueChargePerDay: e.target.value === '' ? null : Number(e.target.value) })} />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="2" />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="submit-btn">Save Accessory</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Accessories;
