import React, { useState, useEffect, useMemo } from 'react';
import { toolAPI, bookingAPI } from '../services/api';
import { Package, Search, RefreshCw, CheckCircle, Clock, MapPin, Hash, Tag, Banknote } from 'lucide-react';
import DataTable from './DataTable';
import '../styles/books.css';
import './StockInventory.css';

const StockInventory = () => {
  const [tools, setTools]         = useState([]);
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([toolAPI.get(), bookingAPI.get()]);
      setTools(tRes.data || []);
      setBookings(bRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toolStatus = useMemo(() => {
    return tools.map(tool => {
      const activeBooking = bookings.find(b => {
        const start = new Date(b.pickupDate).toISOString().split('T')[0];
        const end   = new Date(b.returnDate).toISOString().split('T')[0];
        return b.tool?._id === tool._id &&
               today >= start && today <= end &&
               ['Confirmed', 'Active'].includes(b.status);
      });
      return { ...tool, currentStatus: activeBooking ? 'Rented' : 'In Stock', activeBooking: activeBooking || null };
    });
  }, [tools, bookings, today]);

  const filteredTools = useMemo(() => {
    return toolStatus.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        (t.number   || '').toLowerCase().includes(q) ||
        (t.model    || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Available' && t.currentStatus === 'In Stock') ||
        (statusFilter === 'Rented'    && t.currentStatus === 'Rented');
      return matchSearch && matchStatus;
    });
  }, [toolStatus, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total     = toolStatus.length;
    const available = toolStatus.filter(t => t.currentStatus === 'In Stock').length;
    const rented    = total - available;
    return { total, available, rented };
  }, [toolStatus]);

  const columns = ['TOOL ID', 'MODEL', 'CATEGORY', 'DAILY RATE', 'CURRENT STATUS', 'LOCATION'];

  return (
    <div className="book-container">

      {/* ── KPI Cards ── */}
      <div className="book-summary">
        <div className="summary-item">
          <label>Total Tools</label>
          <h3>{stats.total}</h3>
          <Package size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Available (In Stock)</label>
          <h3 style={{ color: 'var(--success)' }}>{stats.available}</h3>
          <CheckCircle size={16} color="var(--success)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Rented Out</label>
          <h3 style={{ color: 'var(--warning)' }}>{stats.rented}</h3>
          <Clock size={16} color="var(--warning)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="book-filters">
        <div className="search-and-refresh" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div className="search-box-unified">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by ID, Model or Category…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
            <button className="utility-icon-btn" onClick={fetchData} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
          </div>
        <div className="filter-actions">
          <div className="tab-switcher">
            {['All', 'Available', 'Rented'].map(s => (
              <button
                key={s}
                className={statusFilter === s ? 'active-tab' : ''}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
          
        </div>
      </div>

      {/* ── Desktop Table ── */}
      <div className="compliance-card si-desktop-table">
        <DataTable
          columns={columns}
          data={filteredTools.map(t => ({
            'TOOL ID':        <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{t.number}</strong>,
            'MODEL':          t.model || '—',
            'CATEGORY':       t.category || '—',
            'DAILY RATE':     `LKR ${(t.dailyRate || 0).toLocaleString()}`,
            'CURRENT STATUS': (
              <span className={`status-badge ${t.currentStatus === 'In Stock' ? 'status-completed' : 'status-active'}`}>
                {t.currentStatus === 'In Stock' ? 'Available' : 'Rented'}
              </span>
            ),
            'LOCATION': t.currentStatus === 'In Stock' ? 'Warehouse' : (t.activeBooking?.city || 'On Site')
          }))}
          loading={loading}
        />
      </div>

      {/* ── Mobile Card Grid ── */}
      <div className="si-mobile-grid">
        {loading ? (
          <div className="si-loading-state">
            <div className="shimmer-loader" style={{ height: '80px', borderRadius: '16px' }} />
            <div className="shimmer-loader" style={{ height: '80px', borderRadius: '16px', marginTop: '12px' }} />
            <div className="shimmer-loader" style={{ height: '80px', borderRadius: '16px', marginTop: '12px' }} />
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="si-empty-state">
            <div className="si-empty-icon">📦</div>
            <p>No tools found</p>
          </div>
        ) : (
          filteredTools.map(t => (
            <div key={t._id} className={`si-card ${t.currentStatus === 'Rented' ? 'si-card-rented' : 'si-card-available'}`}>
              <div className="si-card-header">
                <div className="si-card-id">
                  <Hash size={13} />
                  {t.number}
                </div>
                <span className={`status-badge ${t.currentStatus === 'In Stock' ? 'status-completed' : 'status-active'}`}>
                  {t.currentStatus === 'In Stock' ? 'Available' : 'Rented'}
                </span>
              </div>

              <div className="si-card-body">
                <div className="si-card-row">
                  <Tag size={13} />
                  <span className="si-card-label">Model</span>
                  <span className="si-card-value">{t.model || '—'}</span>
                </div>
                <div className="si-card-row">
                  <Package size={13} />
                  <span className="si-card-label">Category</span>
                  <span className="si-card-value">{t.category || '—'}</span>
                </div>
                <div className="si-card-row">
                  <Banknote size={13} />
                  <span className="si-card-label">Daily Rate</span>
                  <span className="si-card-value" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                    LKR {(t.dailyRate || 0).toLocaleString()}
                  </span>
                </div>
                <div className="si-card-row">
                  <MapPin size={13} />
                  <span className="si-card-label">Location</span>
                  <span className="si-card-value">
                    {t.currentStatus === 'In Stock' ? 'Warehouse' : (t.activeBooking?.city || 'On Site')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default StockInventory;
