import React, { useState } from 'react';
import Tools from './Tools';
import Accessories from './Accessories';
import StockInventory from './StockInventory';
import { Package, Box, LayoutGrid } from 'lucide-react';
import '../styles/books.css';
import './InventoryDashboard.css';

const TABS = [
  { key: 'tools',       label: 'Tool Inventory',      Icon: Package    },
  { key: 'accessories', label: 'Parts & Accessories',  Icon: Box        },
  { key: 'stock',       label: 'Stock Overview',       Icon: LayoutGrid },
];

const InventoryDashboard = () => {
  const [activeTab, setActiveTab] = useState('tools');

  return (
    <div className="inventory-dashboard page-enter">

      {/* ── Premium Tab Bar ── */}
      <div className="inv-tab-bar">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`inv-tab-btn ${activeTab === key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <span className="inv-tab-icon"><Icon size={17} /></span>
            <span className="inv-tab-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="inventory-content">
        {activeTab === 'tools'       && <Tools />}
        {activeTab === 'accessories' && <Accessories />}
        {activeTab === 'stock'       && <StockInventory />}
      </div>
    </div>
  );
};

export default InventoryDashboard;
