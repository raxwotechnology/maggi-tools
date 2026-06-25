import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './DataTable';
import { Edit } from "lucide-react";
import Modal from './Modal';
import CheckoutModal from './CheckoutModal';
import BookingForm from './BookingForm';
import RecordDetails from './RecordDetails';
import { bookingAPI, clientAPI, invoiceAPI } from '../services/api';
import api from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';
import { generateInvoicePDF } from '../utils/billingGenerator';
import { generateGenericReportPDF } from '../utils/genericReportGenerator';
import InvoiceForm from './InvoiceForm';
import { Download, Eye, Search, PlusCircle, RefreshCw, Filter, Calendar as CalIcon, ChevronRight, TrendingUp, Clock, CheckCircle, AlertCircle, Package, Bell, Trash2, Printer, FileText, UserPlus, Users, X, DollarSign, Send, MessageCircle, Calendar } from 'lucide-react';
import '../styles/forms.css';
import '../styles/books.css';
import { calculateBookingCosts } from '../utils/bookingCalculations';

const BookingBook = ({ setActiveTab }) => {
  const userRole = localStorage.getItem('raxwo_user_role');
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canManage = isDev || ['Admin', 'Manager'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [returnRecord, setReturnRecord] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);

  // Client lookup state (merged with main search)
  const [allClients, setAllClients] = useState([]);
  const [clientDetails, setClientDetails] = useState(null);
  const [clientPanelOpen, setClientPanelOpen] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Add client modal
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', contact: '', nic: '' });

  // Auto Invoice Modal
  const [autoInvoiceModalOpen, setAutoInvoiceModalOpen] = useState(false);
  const [autoInvoice, setAutoInvoice] = useState(null);

  const handlePrint = async (booking) => {
    try {
      const res = await api.get('invoices');
      const invoices = res.data || [];
      const invoice = invoices.find(inv => inv.bookingId === booking._id) || booking;
      generateInvoicePDF(invoice, 'print');
    } catch (e) {
      generateInvoicePDF(booking, 'print');
    }
  };

  const handlePrintQuote = async (booking) => {
    try {
      const res = await api.get('invoices');
      const invoices = res.data || [];
      const invoice = invoices.find(inv => inv.bookingId === booking._id) || booking;
      generateInvoicePDF(invoice, 'print');
    } catch (e) {
      generateInvoicePDF(booking, 'print');
    }
  };

  const handleView = (record) => {
    setSelectedRecord(record.rawData || record);
    setViewModalOpen(true);
  };

  const tableColumns = ['INV#', 'CUSTOMER', 'TOOL', 'PICKUP', 'RETURN', 'DAYS', 'TOTAL', 'PAID', 'BALANCE', 'STATUS', 'ACTION'];

  useEffect(() => { 
    fetchBookings(); 
    fetchAllClients();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('accounts');
      setAccounts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch accounts');
    }
  };

  const fetchAllClients = async () => {
    try {
      const res = await clientAPI.get();
      setAllClients(res.data || []);
    } catch (err) {
      console.error('Failed to fetch clients');
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await bookingAPI.get();
      const rawData = Array.isArray(response.data) ? response.data : [];
      const formatted = rawData.map((item, index) => {
        let toolsLabel = '—';
        if (item.items && item.items.length > 0) {
          toolsLabel = item.items.length === 1
            ? item.items[0].toolNumber
            : `${item.items.length} Tools (${item.items.map(it => it.toolNumber).join(', ')})`;
        } else if (item.tool) {
          toolsLabel = typeof item.tool === 'object' ? item.tool.number : 'Tool';
        }

        return {
          ...item,
          rawData: item,
          displayId: item.bookingId || `BK-${(index + 1).toString().padStart(3, '0')}`,
          displayInvoiceNo: item.invoiceNo || '',
          clientName: item.clientName,
          displayTool: toolsLabel,
          displayPickup: new Date(item.pickupDate).toLocaleDateString(),
          displayReturn: new Date(item.returnDate).toLocaleDateString(),
          totalDays: item.totalDays || 1,
          displayTotal: (item.totalAmount || 0).toLocaleString(),
          displayStatus: item.status || 'Confirmed'
        };
      });
      setBookings(formatted);
      setError(null);
    } catch (err) {
      console.error('RAXWO Bookings: Fetch failed', err);
      const msg = err.response?.data?.message || err.message || 'Connection issue: could not load bookings.';
      setError(`RAXWO Sync Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return bookings.filter(r => {
      let matchStatus = true;
      if (statusFilter === 'Returned (Unpaid)') {
        matchStatus = r.status === 'Returned' && (r.balanceAmount || 0) > 0;
      } else if (statusFilter !== 'All') {
        matchStatus = r.status === statusFilter;
      }
      
      let matchPayment = true;
      if (paymentFilter === 'Paid') {
        matchPayment = (r.balanceAmount || 0) <= 0;
      } else if (paymentFilter === 'Unpaid') {
        matchPayment = (r.balanceAmount || 0) > 0;
      }

      const search = searchQuery.toLowerCase().trim();
      if (!search) return matchStatus && matchPayment;

      const matchSearch =
        r.clientName?.toLowerCase().includes(search) ||
        r.displayTool?.toLowerCase().includes(search) ||
        r.invoiceNo?.toLowerCase().includes(search) ||
        r.displayInvoiceNo?.toLowerCase().includes(search) ||
        r.bookingId?.toLowerCase().includes(search) ||
        (r.items && r.items.some(it => it.toolNumber?.toLowerCase().includes(search)));

      return matchStatus && matchPayment && matchSearch;
    });
  }, [bookings, statusFilter, paymentFilter, searchQuery]);

  // Unified search handler: filters bookings + looks up client profile
  const handleUnifiedSearch = async (value) => {
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);

    if (!value.trim()) {
      setClientDetails(null);
      setClientPanelOpen(false);
      return;
    }

    // Check if the query matches an exact client name
    const matched = allClients.find(
      c => c.name?.toLowerCase() === value.toLowerCase().trim()
    );

    if (matched) {
      setLoadingClient(true);
      try {
        const res = await bookingAPI.getClientDetails(matched.name);
        setClientDetails(res.data);
        setClientPanelOpen(true);
      } catch (err) {
        setClientPanelOpen(false);
      } finally {
        setLoadingClient(false);
      }
    } else {
      setClientDetails(null);
      setClientPanelOpen(false);
    }
  };

  const handleSuggestionSelect = (name) => {
    handleUnifiedSearch(name);
    setShowSuggestions(false);
  };

  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await clientAPI.create({ ...newClient, status: 'Active' });
      setSuccess('Client added successfully');
      setAddClientOpen(false);
      fetchAllClients();
      setNewClient({ name: '', contact: '', nic: '' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessFollowups = async () => {
    if (!window.confirm('Process automated follow-up SMS for overdue bookings?')) return;
    setLoading(true);
    try {
      const res = await bookingAPI.processFollowups();
      setSuccess(res.data.message);
      fetchBookings();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to process follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessOverdueCharges = async () => {
    if (!window.confirm('Calculate and apply daily overdue charges for all active rentals?')) return;
    setLoading(true);
    try {
      const res = await bookingAPI.processOverdueCharges();
      setSuccess(res.data.message);
      fetchBookings();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to process overdue charges');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const active = filteredRecords.filter(r => r.status === 'Active').length;
    const revenue = filteredRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    return { total, active, revenue };
  }, [filteredRecords]);

  const handleEdit = (item) => {
    setEditingItem(item.rawData || item);
    setIsModalOpen(true);
  };

  const handleStatusCycle = async (e, record) => {
    e.stopPropagation();
    if (!canManage) return;

    const statuses = ['Confirmed', 'Active', 'Returned', 'Cancelled'];
    const currentIdx = statuses.indexOf(record.status || 'Confirmed');
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];

    if (nextStatus === 'Returned') {
      setReturnRecord(record);
      setReturnDate(new Date().toISOString().split('T')[0]);
      setReturnModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      await bookingAPI.update(record._id, { status: nextStatus });
      setSuccess(`Status updated to ${nextStatus}`);
      fetchBookings();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Quick update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this booking record?')) {
      try {
        await bookingAPI.delete(id);
        setSuccess('Booking record deleted.');
        fetchBookings();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) { setError('Could not delete record.'); }
    }
  };

  const handleMarkAsPaid = async (record) => {
    const rec = record.rawData || record;
    setReturnRecord(rec);
    setReturnModalOpen(true);
  };

  const handleNotify = async (e, record) => {
    e.stopPropagation();
    if (!record.clientPhone) return alert('No phone number found for this customer.');
    if (!window.confirm(`Resend booking SMS to ${record.clientName}?`)) return;
    setLoading(true);
    try {
      await bookingAPI.sendReminder(record._id);
      setSuccess(`SMS sent to ${record.clientName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to send SMS.';
      setError(errMsg);
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (e, record) => {
    e.stopPropagation();
    if (!record.clientPhone) return alert('No phone number found.');

    const phone = record.clientPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Reminder from DVD Tool Rentals: Dear ${record.clientName}, your rental of ${record.tool ? record.tool.number : 'Tool'} is due on ${new Date(record.returnDate).toLocaleDateString()}. Please ensure timely return to avoid extra charges.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleReturnSubmit = async () => {
    if (!returnRecord) return;
    setLoading(true);
    try {
      const payload = {
        returnedItems: returnedItemsState.map(it => ({ id: it.id, quantity: Number(it.returningQty), date: it.date })),
        returnedAccessories: returnedAccsState.map(ac => ({ id: ac.id, quantity: Number(ac.returningQty), date: ac.date })),
        paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
        paymentMethod: paymentMethod,
        accountId: accountId
      };
      
      const res = await api.put(`/bookings/${returnRecord._id}/partial-return`, payload);
      
      setSuccess(`Return processed successfully. Status: ${res.data.status}`);
      setReturnModalOpen(false);
      fetchBookings();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process return.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    try {
      let createdBookingId = null;
      if (Array.isArray(formData)) {
        const res = await bookingAPI.bulkCreate(formData);
        const list = res.data?.bookings || res.data || [];
        const smsCount = list.filter((b) => b.smsSent).length;
        let msg = `${formData.length} booking(s) created successfully.`;
        if (smsCount > 0) msg += ` ${smsCount} confirmation SMS sent.`;
        setSuccess(msg);
        const firstBooking = list[0];
        if (firstBooking) {
          try {
            const invRes = await api.get('invoices');
            const invoices = invRes.data || [];
            const generatedInvoice = invoices.find((inv) => inv.bookingId === firstBooking._id);
            if (generatedInvoice) {
              setAutoInvoice(generatedInvoice);
              setAutoInvoiceModalOpen(true);
            }
          } catch (err) {
            console.error('Failed to fetch auto-invoice', err);
          }
        }
      } else if (editingItem && editingItem._id) {
        await bookingAPI.update(editingItem._id, formData);
        setSuccess('Booking updated successfully.');
      } else {
        const res = await bookingAPI.create(formData);
        const booking = res.data;
        createdBookingId = booking?._id;
        let msg = 'Booking created successfully.';
        if (booking?.clientPhone) {
          if (booking.smsSent) {
            msg += ' Confirmation SMS sent to customer.';
          } else if (booking.smsError) {
            msg += ` SMS could not be sent: ${booking.smsError}`;
          }
        }
        setSuccess(msg);
        if (createdBookingId) {
          try {
            const invRes = await api.get('invoices');
            const invoices = invRes.data || [];
            const generatedInvoice = invoices.find((inv) => inv.bookingId === createdBookingId);
            if (generatedInvoice) {
              setAutoInvoice(generatedInvoice);
              setAutoInvoiceModalOpen(true);
            }
          } catch (err) {
            console.error('Failed to fetch auto-invoice', err);
          }
        }
      }
      fetchBookings();
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      const msg = err.response?.data?.message || 'Failed to save booking.';
      setError(msg);
      alert('Booking Failed: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    generateGenericReportPDF('Tool Reservations Report', ['INV#', 'CUSTOMER', 'TOOL', 'PICKUP', 'RETURN', 'DAYS', 'TOTAL', 'STATUS'], filteredRecords);
  };

  // Filtered suggestions for autocomplete dropdown
  const clientSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !showSuggestions) return [];
    const q = searchQuery.toLowerCase();
    return allClients
      .filter(c => c.name?.toLowerCase().includes(q))
      .slice(0, 6)
      .map(c => c.name);
  }, [searchQuery, allClients, showSuggestions]);



  return (
    <div className="book-container">

      {/* ── Summary ── */}
      <div className="book-summary">
        <div className="summary-item">
          <label>Total Reservations</label>
          <h3>{stats.total}</h3>
          <TrendingUp size={16} color="var(--accent)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Tools in Use</label>
          <h3 style={{ color: 'var(--warning)' }}>{stats.active}</h3>
          <Clock size={16} color="var(--warning)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
        <div className="summary-item">
          <label>Gross Revenue</label>
          <h3 style={{ color: 'var(--success)' }}>LKR {stats.revenue.toLocaleString()}</h3>
          <CheckCircle size={16} color="var(--success)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }} />
        </div>
      </div>

      {/* ── Unified Filters & Search Bar ── */}
      <div className="book-filters">
        {/* ─ Row 1: Search + Action Buttons ─ */}
        <div className="bf-top-row">
          <div className="search-box-unified" style={{ position: 'relative' }}>
            {loadingClient
              ? <RefreshCw className="search-icon spinner" size={18} />
              : <Search className="search-icon" size={18} />}
            <input
              type="text"
              placeholder="Search by customer name, tool ID, booking ID..."
              value={searchQuery}
              onChange={e => handleUnifiedSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => { setSearchQuery(''); setClientDetails(null); setClientPanelOpen(false); setShowSuggestions(false); }}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
            {/* Autocomplete dropdown */}
            {showSuggestions && clientSuggestions.length > 0 && (
              <ul className="search-suggestions">
                {clientSuggestions.map(name => (
                  <li key={name} onMouseDown={() => handleSuggestionSelect(name)}>
                    <Users size={14} />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bf-action-btns">
            <button className="utility-icon-btn" onClick={handleProcessOverdueCharges} title="Process Overdue Charges & SMS">
              <Calendar size={18} />
            </button>
            <button className="utility-icon-btn" onClick={handleProcessFollowups} title="Process 14-Day SMS Follow-ups">
              <Send size={18} />
            </button>
            <button className="utility-icon-btn" onClick={fetchBookings} title="Refresh">
              <RefreshCw size={20} className={loading ? 'spinner' : ''} />
            </button>
            <button className="utility-icon-btn" onClick={handleExportPDF} title="Export PDF">
              <Download size={20} />
            </button>
            {canManage && (
              <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
                <PlusCircle size={20} /> New Booking
              </button>
            )}
          </div>
        </div>

        {/* ─ Row 2: Status & Payment Tabs ─ */}
        <div className="bf-tabs-row">
          <div className="tab-switcher" style={{ margin: 0 }}>
            {['All', 'Confirmed', 'Active', 'Returned', 'Returned (Unpaid)', 'Cancelled', 'Completed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={statusFilter === s ? 'active-tab' : ''}>
                {s}
              </button>
            ))}
          </div>
          <div className="tab-switcher" style={{ margin: 0 }}>
            {['All', 'Paid', 'Unpaid'].map(s => (
              <button key={s} onClick={() => setPaymentFilter(s)} className={paymentFilter === s ? 'active-tab' : ''}>
                {s === 'All' ? 'All Payments' : s}
              </button>
            ))}
          </div>
        </div>

        {/* ─ Client Profile Card (shown when name matches) ─ */}
        {clientDetails && clientPanelOpen && (
          <div className="client-profile-inline">
            <div className="cpi-info">
              <div className="cpi-avatar">{clientDetails.client.name?.charAt(0).toUpperCase()}</div>
              <div>
                <div className="cpi-name">{clientDetails.client.name}</div>
                <div className="cpi-meta">{clientDetails.client.contact}{clientDetails.client.nic ? ` · ${clientDetails.client.nic}` : ''}</div>
              </div>
            </div>
            <div className="cpi-stats">
              <div className="cpi-stat">
                <span className="cpi-stat-label">Total Bookings</span>
                <span className="cpi-stat-value accent">{clientDetails.summary.totalBookings}</span>
              </div>
              <div className="cpi-stat">
                <span className="cpi-stat-label">Total Paid</span>
                <span className="cpi-stat-value success">
                  LKR {((clientDetails.summary.totalRevenue || 0) - (clientDetails.summary.totalOutstanding || 0)).toLocaleString()}
                </span>
              </div>
              <div className="cpi-stat">
                <span className="cpi-stat-label">Balance Due</span>
                <span className={`cpi-stat-value ${clientDetails.summary.totalOutstanding > 0 ? 'danger' : 'success'}`}>
                  LKR {(clientDetails.summary.totalOutstanding || 0).toLocaleString()}
                </span>
              </div>
              <div className="cpi-stat">
                <span className="cpi-stat-label">Deposit Held</span>
                <span className="cpi-stat-value accent">
                  LKR {(clientDetails.summary.totalDeposit || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <button className="cpi-close" onClick={() => setClientPanelOpen(false)} title="Close profile">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {success && <div className="form-info-banner" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}><CheckCircle size={18} /> {success}</div>}
      {error && <div className="form-info-banner" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}><AlertCircle size={18} /> {error}</div>}

      <div className="compliance-card">
        <DataTable
          columns={tableColumns}
          data={filteredRecords.map(r => ({
            ...r,
            'INV#': <span style={{ fontWeight: 800, color: 'var(--text-dim)' }}>{r.displayInvoiceNo || '—'}</span>,
            CUSTOMER: <strong style={{ color: 'var(--text-main)' }}>{r.clientName || '—'}</strong>,
            TOOL: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.displayTool}</span>,
            PICKUP: r.displayPickup,
            RETURN: r.displayReturn,
            DAYS: <span className="status-badge status-confirmed" style={{ background: 'var(--bg-side)', color: 'var(--text-main)' }}>{r.totalDays || 1} Days</span>,
            TOTAL: <strong style={{ color: 'var(--text-main)', whiteSpace: 'nowrap' }}>LKR {r.displayTotal}</strong>,
            PAID: <strong style={{ color: 'var(--success)', whiteSpace: 'nowrap' }}>LKR {(r.advancePayment || 0).toLocaleString()}</strong>,
            BALANCE: <strong style={{ color: (r.balanceAmount || 0) > 0 ? 'var(--danger)' : 'var(--accent)', whiteSpace: 'nowrap' }}>LKR {Math.max(0, r.balanceAmount || 0).toLocaleString()}</strong>,
            STATUS: (
              Number(r.balanceAmount || 0) <= 0 ? (
                <span
                  className="status-badge status-paid"
                  style={{
                    background: 'var(--success-soft)',
                    color: 'var(--success)',
                    fontWeight: 800,
                    borderRadius: '999px',
                    padding: '6px 12px',
                    display: 'inline-block'
                  }}
                >
                  Paid
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <select
                    value={r.displayStatus || 'Confirmed'}
                    onChange={async (e) => {
                      e.stopPropagation();
                      try {
                        await bookingAPI.update(r._id, { status: e.target.value });
                        fetchBookings();
                      } catch (err) { alert('Failed to update status.'); }
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      border: 'none', borderRadius: '8px', padding: '5px 10px',
                      fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                      background: r.displayStatus === 'Active' ? '#fef08a'
                        : r.displayStatus === 'Returned' ? 'var(--success-soft)'
                        : r.displayStatus === 'Cancelled' ? '#fee2e2' : 'var(--bg-side)',
                      color: r.displayStatus === 'Active' ? '#854d0e'
                        : r.displayStatus === 'Returned' ? 'var(--success)'
                        : r.displayStatus === 'Cancelled' ? 'var(--danger)' : 'var(--text-main)'
                    }}
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Active">Active</option>
                    <option value="Returned">Returned</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                  {r.displayStatus === 'Returned' && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      (Unpaid)
                    </span>
                  )}
                </div>
              )
            ),
            ACTION: (
              <div className="table-actions booking-record-actions" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="booking-btn-view"
                  onClick={() => handleView(r)}
                  title="View Details"
                >
                  <Eye size={18} strokeWidth={2.5} />
                  <span>View</span>
                </button>
                {(canManage || (r.invoiceId && Number(r.balanceAmount || 0) > 0)) && (
                  <div className="booking-btn-icon-row">
                    {r.invoiceId && Number(r.balanceAmount || 0) > 0 && (
                      <button
                        type="button"
                        className="action-icon-btn btn-paid"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsPaid(r);
                        }}
                        title="Mark as Paid"
                      >
                        <CheckCircle />
                      </button>
                    )}
                    {canManage && (
                      <>
                    <button
                      type="button"
                      className="action-icon-btn btn-print"
                      onClick={(e) => { e.stopPropagation(); handlePrint(r.rawData); }}
                      title="Print Bill"
                    >
                      <Printer />
                    </button>
                    <button
                      type="button"
                      className="action-icon-btn btn-details"
                      onClick={(e) => { e.stopPropagation(); handlePrintQuote(r.rawData); }}
                      title="Print Copy"
                    >
                      <FileText />
                    </button>
                    <button
                      type="button"
                      className="action-icon-btn btn-edit"
                      onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
                      title="Edit"
                    >
                      <Edit />
                    </button>
                    {(r.status !== 'Draft' && r.status !== 'Cancelled') && (
                      <button
                        type="button"
                        className="action-icon-btn btn-return"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rec = r.rawData || r;
                          setReturnRecord(rec);
                          setReturnModalOpen(true);
                        }}
                        title="Mark Returned"
                      >
                        <Package size={16} />
                      </button>
                    )}
                    <button type="button" className="action-icon-btn btn-bell" onClick={(e) => handleNotify(e, r)} title="SMS">
                      <Bell />
                    </button>
                    <button type="button" className="action-icon-btn btn-msg" onClick={(e) => handleWhatsApp(e, r)} title="WhatsApp">
                      <MessageCircle />
                    </button>
                    <button type="button" className="action-icon-btn btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }} title="Delete">
                      <Trash2 />
                    </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          }))}
          loading={loading}
          
        />
      </div>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Booking Details" wide>
        <RecordDetails data={selectedRecord} type="booking" />
        <div className="modal-actions" style={{ marginTop: 0, paddingTop: 16 }}>
          <button type="button" className="cancel-btn" onClick={() => setViewModalOpen(false)}>Close</button>
          {canManage && selectedRecord && (
            <button type="button" className="submit-btn" onClick={() => { setViewModalOpen(false); handleEdit({ rawData: selectedRecord }); }}>
              Edit Booking
            </button>
          )}
        </div>
      </Modal>

      <CheckoutModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        bookingRecord={returnRecord}
        accounts={accounts}
        onComplete={(updatedRecord) => {
          setSuccess('Processed successfully.');
          fetchBookings();
          if (updatedRecord && updatedRecord._id) {
            setReturnRecord(updatedRecord);
          } else {
            setReturnModalOpen(false);
          }
          setTimeout(() => setSuccess(null), 3000);
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        title={editingItem ? 'Edit Booking' : 'New Tool Booking'}
        wide={true}
      >
        <BookingForm onSubmit={handleFormSubmit} onCancel={() => { setIsModalOpen(false); setEditingItem(null); }} initialData={editingItem} />
      </Modal>

      {/* ── Add Client Modal ── */}
      <Modal isOpen={addClientOpen} onClose={() => setAddClientOpen(false)} title="Add New Customer">
        <form onSubmit={handleAddClientSubmit} className="hire-form" style={{ padding: '20px' }}>
          <div className="form-group">
            <label>Customer Name *</label>
            <input required type="text" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input type="text" value={newClient.contact} onChange={e => setNewClient({ ...newClient, contact: e.target.value })} />
          </div>
          <div className="form-group">
            <label>NIC / Passport</label>
            <input type="text" value={newClient.nic} onChange={e => setNewClient({ ...newClient, nic: e.target.value })} />
          </div>
          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="cancel-btn" onClick={() => setAddClientOpen(false)}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Saving...' : 'Add Customer'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Auto Invoice Modal ── */}
      <Modal isOpen={autoInvoiceModalOpen} onClose={() => { setAutoInvoiceModalOpen(false); setAutoInvoice(null); }} title="Professional Bill" wide={true}>
        <div style={{ marginBottom: '15px', background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <CheckCircle size={18} /> Booking confirmed. Confirmation SMS was sent using your Settings template.
        </div>
        {autoInvoice && (
          <InvoiceForm
            initialData={autoInvoice}
            onSubmit={async (d) => {
              await api.put(`/invoices/${autoInvoice._id}`, d);
              setAutoInvoiceModalOpen(false);
              generateInvoicePDF(d, 'print');
              if (setActiveTab) {
                setActiveTab('invoices');
              }
            }}
            onCancel={() => setAutoInvoiceModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default BookingBook;
