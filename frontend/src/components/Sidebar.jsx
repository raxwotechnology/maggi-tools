import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Contact,
  LogOut,
  UserCircle,
  FileBarChart,
  FileText,
  FileCheck,
  Wallet,
  TrendingDown,
  X,
  Shield,
  Package,
  Wrench,
  Clock,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab, handleLogout, role, userName, isOpen, isCollapsed, onClose, onToggleCollapse, appSettings }) => {
  const menuCategories = [
    {
      title: 'Operations',
      collapsible: true,
      items: [
        { id: 'dashboard',  label: 'Main Dashboard',     icon: LayoutDashboard },
        { id: 'bookings',   label: 'Rentals & Bookings', icon: FileCheck },
        { id: 'invoices',   label: 'Invoices & Payments',  icon: FileText },
        { id: 'quotations', label: 'Price Quotes',       icon: FileCheck },
      ]
    },
    {
      title: 'Inventory',
      collapsible: true,
      items: [
        { id: 'inventory',  label: 'Combined Inventory', icon: Package },
        { id: 'compliance', label: 'Service & Maint.',   icon: Wrench },
      ]
    },
    {
      title: 'Finance',
      collapsible: true,
      items: [

        { id: 'accounts',    label: 'Bank Accounts',     icon: Wallet },
        { id: 'cheques',     label: 'Cheque Ledger',     icon: FileText },
        { id: 'expenses',    label: 'Other Expenses',    icon: TrendingDown },
        { id: 'extraIncome', label: 'Extra Income',      icon: Wallet },
        { id: 'reports',     label: 'Financial Reports', icon: FileBarChart },
      ]
    },
    {
      title: 'Staff & CRM',
      collapsible: true,
      items: [
        { id: 'employees',  label: 'Our Team',           icon: UserCircle },
        { id: 'salaries',   label: 'Staff Salaries',     icon: Contact },
        { id: 'clients',    label: 'Customer List',      icon: Users },
      ]
    },
    {
      title: 'System',
      collapsible: true,
      items: [
        { id: 'audit',     label: 'Audit Trail', icon: Clock },
        { id: 'settings',  label: 'Settings',    icon: SettingsIcon },
      ]
    }
  ];

  const [openCategories, setOpenCategories] = React.useState(() => {
    const initial = {};
    menuCategories.forEach(cat => {
      // Open if it contains the active tab, otherwise closed
      const hasActive = cat.items.some(item => item.id === activeTab);
      initial[cat.title] = hasActive || !cat.collapsible;
    });
    return initial;
  });

  const toggleCategory = (title) => {
    setOpenCategories(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredCategories = menuCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      if (role !== 'Admin' && role !== 'Manager') {
        return ['dashboard', 'bookings', 'inventory', 'compliance'].includes(item.id);
      }
      return true;
    })
  })).filter(cat => cat.items.length > 0);

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-row">
          {appSettings?.logo ? (
            <img src={appSettings.logo} alt="Logo" className="raxwo-logo-img" />
          ) : (
            <div className="placeholder-logo"><Package size={24} /></div>
          )}
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {!isCollapsed && (
          <div className="logo-text">
            <span className="logo-subtitle">{appSettings?.companyName || 'TOOL RENTALS'}</span>
          </div>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="sidebar-user-section">
          <div className="user-profile-glass">
            <div className="avatar-wrapper">
               <div className="profile-initials">{(userName || 'A')[0].toUpperCase()}</div>
               <div className="online-indicator"></div>
            </div>
            <div className="profile-info">
              <p className="profile-name">{userName && userName !== 'null' ? userName : 'Administrator'}</p>
              <div className="role-badge">
                 <Shield size={10} />
                 <span>{role || 'System'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCollapsed && (
        <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
          <div className="profile-initials" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>
            {(userName || 'A')[0].toUpperCase()}
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {filteredCategories.map((category, catIdx) => {
          const isExpanded = !category.collapsible || openCategories[category.title] !== false;
          return (
            <div key={catIdx} className="sidebar-category">
              {!isCollapsed && (
                <div
                  className="category-title"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: category.collapsible ? 'pointer' : 'default',
                    userSelect: 'none'
                  }}
                  onClick={() => category.collapsible && toggleCategory(category.title)}
                >
                  <span>{category.title}</span>
                  {category.collapsible && (
                    isExpanded
                      ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
                      : <ChevronRight size={13} style={{ opacity: 0.5 }} />
                  )}
                </div>
              )}
              {(isCollapsed || isExpanded) && category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    title={isCollapsed ? item.label : ''}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth <= 1024) onClose();
                    }}
                  >
                    <div className="nav-icon-box">
                      <Icon size={18} />
                    </div>
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
