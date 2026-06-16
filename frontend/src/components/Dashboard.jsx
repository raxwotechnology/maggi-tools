import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Wallet, ArrowDown,
  BarChart, RefreshCw, CheckCircle, Clock, Users,
  ShieldCheck, FileText, CreditCard, Bell, ChevronRight,
  Package, Wrench, FileBarChart, Calendar
} from 'lucide-react';
import { bookingAPI, salaryAPI, paymentAPI, invoiceAPI, toolAPI, expenseAPI, extraIncomeAPI } from '../services/api';
import Modal from './Modal';
import RecordDetails from './RecordDetails';
import './Dashboard.css';

const pulseStyle = `
  @keyframes pulse-red {
    0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    70% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }
  .pulse-icon {
    animation: pulse-red 2s infinite ease-in-out;
  }
`;

/* ── Helpers ── */
const fmt = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

const getUrgencyColor = (date) => {
  if (!date) return 'var(--text-dim)';
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return 'var(--danger)';
  if (diffDays <= 3) return 'var(--warning)';
  return 'var(--accent)';
};

const isExpiringSoon = (date, daysThreshold = 7) => {
  if (!date) return false;
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold;
};

/* ── Reminder Card ── */
const ReminderCard = ({ r }) => {
  const isToday = r.daysLeft <= 0;
  const isTomorrow = r.daysLeft === 1;

  let urgencyColor = '#6366F1'; // default indigo
  let iconColor = '#6366F1';

  if (r.daysLeft <= 0) {
    urgencyColor = '#EF4444'; // red
    iconColor = '#EF4444';
  } else if (r.daysLeft <= 2) {
    urgencyColor = '#F59E0B'; // orange
    iconColor = '#F59E0B';
  }

  let badgeStyle = {
    background: 'rgba(99, 102, 241, 0.1)',
    color: '#6366F1',
    border: '1px solid rgba(99, 102, 241, 0.2)'
  };
  let badgeText = `${r.daysLeft}d`;

  if (isToday) {
    badgeStyle = { background: '#EF4444', color: '#fff', border: 'none' };
    badgeText = 'DUE';
  } else if (isTomorrow) {
    badgeStyle = { background: '#F59E0B', color: '#fff', border: 'none' };
    badgeText = 'TOMORROW';
  }

  return (
    <div className="reminder-card" style={{ borderLeftColor: urgencyColor }}>
      <div className="reminder-icon" style={{ color: iconColor }}>
        <r.icon size={22} strokeWidth={2.5} />
      </div>
      <div className="reminder-info">
        <div className="reminder-header">
          <span className="reminder-tool">{r.tool}</span>
          <span className="reminder-badge" style={badgeStyle}>{badgeText}</span>
        </div>
        <p className="reminder-type">{r.type}</p>
      </div>
    </div>
  );
};

/* ── Stat Card ── */
const StatCard = ({ title, value, subtext, icon: Icon, color, onClick }) => (
  <div className={`stat-card ${onClick ? 'clickable' : ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="stat-icon" style={{ color }}>
      <Icon size={26} />
    </div>
    <div className="stat-info">
      <p className="stat-title">{title}</p>
      <h3 className="stat-value">{value}</h3>
      <p className="stat-subtext">{subtext}</p>
    </div>
  </div>
);

/* ── Dashboard Component ── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const Dashboard = ({ role = 'User', name = 'Guest', setActiveTab }) => {
  const currentRole = (role || '').toLowerCase();
  const isAdmin = currentRole === 'admin' || currentRole === 'manager';
  const isEmployee = currentRole === 'employee';
  const isStaff = isAdmin || isEmployee;
  const displayName = name && name !== 'null' ? name : 'Administrator';

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = pulseStyle;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  const [data, setData] = useState({ bookings: [], salaries: [], payments: [], invoices: [], tools: [], expenses: [], extraIncome: [] });
  const [insights, setInsights] = useState({ topTools: [], topCustomers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewType, setViewType] = useState('hire');

  const handleOpenDetail = (item, type) => {
    setSelectedRecord(item);
    setViewType(type);
    setViewModalOpen(true);
  };

  const fetchAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [b, s, p, inv, t, ex, ei, insRes] = await Promise.all([
        bookingAPI.get(), salaryAPI.get(),
        paymentAPI.get(), invoiceAPI.get(), toolAPI.get(),
        expenseAPI.get(), extraIncomeAPI.get(),
        bookingAPI.getInsights()
      ]);
      setData({
        bookings: Array.isArray(b.data) ? b.data : [],
        salaries: Array.isArray(s.data) ? s.data : [],
        payments: Array.isArray(p.data) ? p.data : [],
        invoices: Array.isArray(inv.data) ? inv.data : [],
        tools: Array.isArray(t.data) ? t.data : [],
        expenses: Array.isArray(ex.data) ? ex.data : [],
        extraIncome: Array.isArray(ei.data) ? ei.data : [],
      });
      if (insRes.data) setInsights(insRes.data);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      console.error('RAXWO Dashboard: Fetch failed', err);
      setError(`Dashboard Sync Issue: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [name, role]);

  useEffect(() => {
    const onRefresh = () => fetchAll(true);
    window.addEventListener('raxwo_data_updated', onRefresh);
    window.addEventListener('raxwo_lease_updated', onRefresh);
    return () => {
      window.removeEventListener('raxwo_data_updated', onRefresh);
      window.removeEventListener('raxwo_lease_updated', onRefresh);
    };
  }, []);

  const filterByPeriod = (records, dateField = 'date') => {
    return records.filter(r => {
      const d = new Date(r[dateField] || r.createdAt);
      const yearMatch = d.getFullYear() === parseInt(selectedYear);
      const monthMatch = selectedMonth === 'All' || d.getMonth() === MONTHS.indexOf(selectedMonth);
      return yearMatch && monthMatch;
    });
  };

  const groupedReminders = useMemo(() => {
    if (!isAdmin) return { warranty: [], service: [], leasing: [] };
    const groups = { warranty: [], service: [], leasing: [] };
    const today = new Date();

    const getDaysLeft = (date) => {
      const d = new Date(date);
      const diff = d - today;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    data.tools.forEach(t => {
      if (isExpiringSoon(t.warrantyExpirationDate)) {
        groups.warranty.push({ tool: t.number, type: 'Warranty', date: t.warrantyExpirationDate, icon: ShieldCheck, daysLeft: getDaysLeft(t.warrantyExpirationDate) });
      }
      if (isExpiringSoon(t.nextServiceDate)) {
        groups.service.push({ tool: t.number, type: 'Next Service', date: t.nextServiceDate, icon: Wrench, daysLeft: getDaysLeft(t.nextServiceDate) });
      }
      if (t.hasLeasing && t.leaseDueDate) {
        const nextDue = new Date(today.getFullYear(), today.getMonth(), t.leaseDueDate);
        if (isExpiringSoon(nextDue)) {
          groups.leasing.push({ tool: t.number, type: 'Lease Due', date: nextDue, icon: CreditCard, amount: t.monthlyPremium, daysLeft: getDaysLeft(nextDue) });
        }
      }
    });

    data.bookings.forEach(b => {
      if (b.status === 'Active' && isExpiringSoon(b.returnDate, 2)) {
        groups.leasing.push({
          tool: b.tool?.number || 'Unknown Tool',
          type: 'Return Due Soon',
          date: b.returnDate,
          icon: Clock,
          daysLeft: getDaysLeft(b.returnDate)
        });
      }
    });

    return groups;
  }, [data.tools, data.bookings, isAdmin]);

  const hasAnyReminders = useMemo(() => Object.values(groupedReminders).some(g => g.length > 0), [groupedReminders]);

  const stats = useMemo(() => {
    if (isStaff) {
      const fBookings = filterByPeriod(data.bookings, 'pickupDate');
      const fExtra = filterByPeriod(data.extraIncome, 'date');
      const fExpenses = filterByPeriod(data.expenses, 'date');
      const fSalaries = filterByPeriod(data.salaries, 'createdAt');
      const revenue = fBookings.reduce((s, r) => s + (parseFloat(r.totalAmount) || 0), 0) + fExtra.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const cost = fSalaries.reduce((s, r) => s + (parseFloat(r.netPay) || 0), 0) + fExpenses.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const profit = revenue - cost;
      const pending = fBookings.reduce((s, r) => s + (parseFloat(r.balanceAmount) || 0), 0);

      const baseStats = [
        { id: 1, title: 'Total Bookings', value: fBookings.length, subtext: 'Tool rentals', icon: Package, color: 'var(--accent)' },
        { id: 2, title: 'Tools in Use', value: fBookings.filter(b => b.status === 'Active').length, subtext: 'On-site', icon: Clock, color: 'var(--warning)' },
      ];

      if (isAdmin) {
        return [
          { id: 1, title: 'Total Revenue', value: fmt(revenue), subtext: `From ${fBookings.length} rentals`, icon: TrendingUp, color: 'var(--accent)', tab: 'reports' },
          { id: 2, title: 'Operational Cost', value: fmt(cost), subtext: 'Staff, Maint, Expenses', icon: ArrowDown, color: 'var(--danger)', tab: 'expenses' },
          { id: 3, title: 'Net Profit', value: fmt(profit), subtext: 'Estimated earnings', icon: BarChart, color: profit >= 0 ? 'var(--success)' : 'var(--danger)', tab: 'reports' },
          { id: 4, title: 'Pending Dues', value: fmt(pending), subtext: 'To be collected', icon: Clock, color: 'var(--warning)', tab: 'invoices' },
        ];
      }

      return baseStats;
    }

    const myBookings = data.bookings.filter(b => {
      const n = (name || '').trim().toLowerCase();
      return b.clientName?.trim().toLowerCase() === n;
    });
    return [
      { id: 1, title: 'My Total Rentals', value: myBookings.length, subtext: 'Lifetime total', icon: TrendingUp, color: 'var(--accent)' },
      { id: 2, title: 'Active Rentals', value: myBookings.filter(b => b.status === 'Active').length, subtext: 'Currently with me', icon: Clock, color: 'var(--warning)' },
      { id: 3, title: 'Returned Tools', value: myBookings.filter(b => b.status === 'Returned' || b.status === 'Completed').length, subtext: 'Successfully closed', icon: CheckCircle, color: 'var(--success)' },
    ];
  }, [data, isAdmin, isStaff, role, name, selectedMonth, selectedYear]);

  const recentActivity = useMemo(() => {
    const list = isStaff ? data.bookings : data.bookings.filter(b => (b.clientName || '').trim().toLowerCase() === (name || '').trim().toLowerCase());
    return [...list].sort((a, b) => {
      const dateA = new Date(b.pickupDate || b.createdAt || 0);
      const dateB = new Date(a.pickupDate || a.createdAt || 0);
      return dateA - dateB;
    }).slice(0, 5);
  }, [data.bookings, isAdmin, isStaff, role, name]);

  return (
    <div className="dashboard-container">
      <div className="book-header" style={{ marginBottom: '10px' }}>
        <div className="header-title">
          <h2>Hello, {displayName}</h2>
        </div>
        <p className="header-subtitle">Operations Dashboard</p>
      </div>
      <div className="book-filters" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', width: '100%', marginBottom: '24px' }}>
        <div className="search-box-unified" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px 0 12px', flex: 1, height: '44px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)', minWidth: '0' }}>
          <Calendar size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '60%', padding: '0', minWidth: '0' }}>
            <option value="All">All Months</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '40%', padding: '0', minWidth: '0' }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button className="utility-icon-btn" onClick={() => fetchAll(false)} title="Sync Dashboard" style={{ height: '44px', width: '44px', minWidth: '44px', flexShrink: 0 }}>
          <RefreshCw size={18} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {isAdmin && hasAnyReminders && (
        <div className="critical-alerts-section">
          <div className="critical-alerts-header">
            <h3 className="critical-alerts-title">
              <Bell size={20} className="pulse-icon" />
              Maintenance & Warranty Alerts
            </h3>
            <span className="pending-actions-badge">Action Required</span>
          </div>
          <div className="reminders-grid">
            {Object.values(groupedReminders).flat().slice(0, 4).map((r, i) => <ReminderCard key={i} r={r} />)}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="quick-actions-grid">
          <button className="pill-action-btn btn-blue" onClick={() => setActiveTab('bookings')}>
            <div className="pill-icon-box"><Package size={24} /></div>
            <div className="pill-text-box">New Rental</div>
          </button>
          <button className="pill-action-btn btn-emerald" onClick={() => setActiveTab('tool-reg')}>
            <div className="pill-icon-box"><Wrench size={24} /></div>
            <div className="pill-text-box">Register Tool</div>
          </button>
          <button className="pill-action-btn btn-blue" onClick={() => setActiveTab('invoices')} style={{ borderLeft: '3px solid #6366F1' }}>
            <div className="pill-icon-box" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}><FileText size={24} /></div>
            <div className="pill-text-box">Billing Book</div>
          </button>
          <button className="pill-action-btn btn-white" onClick={() => setActiveTab('reports')}>
            <div className="pill-icon-box"><FileBarChart size={24} /></div>
            <div className="pill-text-box">Financials</div>
          </button>
        </div>
      )}

      {error && (
        <div className="form-info-banner" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px' }}>
          <Bell size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="stats-grid">
        {stats.map(s => <StatCard key={s.id} {...s} onClick={s.tab ? () => setActiveTab(s.tab) : null} />)}
      </div>

      {isAdmin && (
        <div className="insights-row">
          <div className="insight-card">
            <div className="section-header" style={{ marginBottom: '20px', background: 'transparent', padding: '0', borderBottom: 'none' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} style={{ color: 'var(--accent)' }} />
                Most Rented Tools
              </h3>
            </div>
            <div className="insight-list">
              {insights.topTools?.length > 0 ? insights.topTools.map((v, i) => (
                <div key={i} className="insight-item">
                  <div className="insight-rank">{i + 1}</div>
                  <div className="insight-info">
                    <span className="insight-name">{v.name}</span>
                    <span className="insight-sub">{v.count} Rentals · High Demand</span>
                  </div>
                  <div className="insight-value">
                    <span className="insight-main-val">{fmt(v.revenue)}</span>
                  </div>
                </div>
              )) : <p className="insight-sub">No data available yet</p>}
            </div>
          </div>

          <div className="insight-card">
            <div className="section-header" style={{ marginBottom: '20px', background: 'transparent', padding: '0', borderBottom: 'none' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} style={{ color: 'var(--success)' }} />
                Top Customers
              </h3>
            </div>
            <div className="insight-list">
              {insights.topCustomers.length > 0 ? insights.topCustomers.map((c, i) => (
                <div key={i} className="insight-item">
                  <div className="insight-rank" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{i + 1}</div>
                  <div className="insight-info">
                    <span className="insight-name">{c.name}</span>
                    <span className="insight-sub">{c.count} Rentals · Recent: {c.latestTool}</span>
                  </div>
                  <div className="insight-value">
                    <span className="insight-main-val" style={{ color: 'var(--success)' }}>{fmt(c.revenue)}</span>
                  </div>
                </div>
              )) : <p className="insight-sub">No data available yet</p>}
            </div>
          </div>
        </div>
      )}

      <div className="recent-activity">
        <div className="section-header">
          <h3>Recent Rental Activity</h3>
          <button className="period-select" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setActiveTab('bookings')}>View All</button>
        </div>
        {recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.map((b, i) => (
              <div key={i} className="activity-item" onClick={() => handleOpenDetail(b, 'booking')}>
                <div className={`activity-indicator ${b.status === 'Returned' || b.status === 'Completed' ? 'green' : 'blue'}`} />
                <div className="activity-details">
                  <p>{b.clientName} · {b.tool?.number || 'No Tool'}</p>
                  <span>{new Date(b.pickupDate).toLocaleDateString()} — {new Date(b.returnDate).toLocaleDateString()}</span>
                </div>
                <div className="activity-value">
                  {fmt(b.totalAmount)}
                  <ChevronRight size={16} style={{ marginLeft: '12px', opacity: 0.3 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-main)', margin: '20px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)' }}>
            <Clock size={48} style={{ marginBottom: '16px', opacity: 0.15 }} />
            <h4 style={{ color: 'var(--text-main)', marginBottom: '8px', fontWeight: 800 }}>No Activity Found</h4>
            <p style={{ fontSize: '0.875rem' }}>
              No records found for the selected period.
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Record Details">
        <RecordDetails data={selectedRecord} type={viewType} />
      </Modal>
    </div>
  );
};

export default Dashboard;
