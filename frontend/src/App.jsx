import React, { useState, useEffect } from 'react';
import { LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BookingBook from './components/BookingBook';
import InventoryDashboard from './components/InventoryDashboard';
import SalaryBook from './components/SalaryBook';
import PaymentBook from './components/PaymentBook';
import Clients from './components/Clients';
import Employees from './components/Employees';
import FinancialReport from './components/FinancialReport';
import InvoiceBook from './components/InvoiceBook';
import QuotationBook from './components/QuotationBook';
import AttendanceBook from './components/AttendanceBook';
import ExtraIncome from './components/ExtraIncome';
import Expenses from './components/Expenses';
import Accounts from './components/Accounts';
import Cheques from './components/Cheques';
import { settingsAPI } from './services/api';
import ComplianceBook from './components/ComplianceBook';
import Login from './components/Login';
import AuditLog from './components/AuditLog';
import RoleSelection from './components/RoleSelection';
import ToolRegistration from './components/ToolRegistration';
import HireBook from './components/HireBook';
import Settings from './components/Settings';
import './App.css';
import './styles/Modal.css';

const PAGE_TITLES = {
  dashboard: 'Main Overview',
  bookings: 'Rentals & Bookings',
  salaries: 'Staff Wages & Payroll',
  payments: 'Payment History',
  clients: 'Our Customers',
  inventory: 'Combined Inventory',
  compliance: 'Maintenance & Service',
  employees: 'Team Members',
  reports: 'Profit & Loss Report',
  invoices: 'Customer Invoices',
  quotations: 'Service Quotes',
  attendance: 'Staff Attendance',
  extraIncome: 'Operational Income',
  expenses: 'Business Expenses',
  accounts: 'Accounts Management',
  cheques: 'Cheques Management',
  'tool-reg': 'Tool Registration',
  hires: 'Daily Rental Log',
  settings: 'System Configuration',
  audit: 'System Audit Trail',
};

const App = () => {
  // Main application state
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('raxwo_auth_token'));
  const [selectedRole, setSelectedRole] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('raxwo_sidebar_collapsed') === 'true');
  const [theme, setTheme] = useState(localStorage.getItem('raxwo_theme') || 'light');
  const [appSettings, setAppSettings] = useState(null);

  const userRole = localStorage.getItem('raxwo_user_role');
  const userName = localStorage.getItem('raxwo_user_name');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('raxwo_theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingsAPI.get();
      setAppSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('raxwo_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('raxwo_auth_token');
    localStorage.removeItem('raxwo_user_role');
    localStorage.removeItem('raxwo_user_name');
    setIsAuthenticated(false);
    setSelectedRole(null);
  };

  useEffect(() => {
    const handleForceLogout = () => {
      handleLogout();
      alert('Your session has expired or is invalid. Please log in again.');
    };
    window.addEventListener('raxwo_force_logout', handleForceLogout);
    return () => window.removeEventListener('raxwo_force_logout', handleForceLogout);
  }, []);

  // ── Session Timeout Logic (15 Minutes) ──
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeout;
    const TIMEOUT_MS = 15 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleLogout();
        alert('Your session has expired due to inactivity. Please log in again.');
      }, TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated]);

  const renderContent = () => {
    const restrictedTabs = ['employees', 'reports', 'salaries', 'clients', 'payments', 'invoices', 'quotations', 'extraIncome', 'expenses', 'attendance', 'hires', 'accounts', 'cheques'];
    if (userRole === 'Employee' && restrictedTabs.includes(activeTab)) {
      return <Dashboard key={activeTab} role={userRole} name={userName} setActiveTab={setActiveTab} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard key="dashboard" role={userRole} name={userName} setActiveTab={setActiveTab} />;
      case 'inventory': return <InventoryDashboard />;
      case 'bookings': return <BookingBook setActiveTab={setActiveTab} />;
      case 'tool-reg': return <ToolRegistration onComplete={() => setActiveTab('inventory')} />;
      case 'salaries': return <SalaryBook />;
      case 'payments':
      case 'invoices': return <InvoiceBook initialTab={activeTab === 'payments' ? 'Payments' : 'Summaries'} />;
      case 'clients': return <Clients />;
      case 'compliance': return <ComplianceBook />;
      case 'employees': return <Employees />;
      case 'reports': return <FinancialReport appSettings={appSettings} />;
      case 'quotations': return <QuotationBook />;
      case 'attendance': return <AttendanceBook />;
      case 'extraIncome': return <ExtraIncome />;
      case 'expenses': return <Expenses />;
      case 'accounts': return <Accounts />;
      case 'cheques': return <Cheques />;
      case 'audit': return <AuditLog />;
      case 'settings': return <Settings onSettingsUpdate={fetchSettings} />;
      default: return <Dashboard role={userRole} name={userName} setActiveTab={setActiveTab} />;
    }
  };

  if (!isAuthenticated) {
    if (!selectedRole) {
      return <RoleSelection onRoleSelect={(role) => setSelectedRole(role)} appSettings={appSettings} />;
    }
    return (
      <Login
        roleContext={selectedRole}
        onLoginSuccess={() => setIsAuthenticated(true)}
        onBack={() => setSelectedRole(null)}
        appSettings={appSettings}
      />
    );
  }

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
        handleLogout={handleLogout}
        role={userRole}
        userName={userName}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={toggleSidebarCollapse}
        appSettings={appSettings}
      />

      <main className="main-content">
        <header className="main-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <button className="desktop-collapse-btn" onClick={toggleSidebarCollapse} title="Toggle Sidebar">
              <Menu size={20} />
            </button>
            <h2>{PAGE_TITLES[activeTab] || 'Dashboard'}</h2>
          </div>

          <div className="header-right">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="user-nav-info">
              <div className="nav-avatar">
                {(userName || 'A')[0].toUpperCase()}
              </div>
              <div className="user-details">
                <p className="user-name-text">{userName && userName !== 'null' ? userName : 'Administrator'}</p>
                <span className="user-role-text">{userRole || 'System Access'}</span>
              </div>
            </div>

            <button className="header-logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
