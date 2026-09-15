import React from 'react';
import ToolForm from './ToolForm';
import { Package } from 'lucide-react';
import '../styles/books.css';

const ToolRegistration = ({ onComplete }) => {
  return (
    <div className="book-container">
      <div className="book-header">
        <div className="header-title">
          <p className="book-subtitle" style={{ margin: 0 }}>Admin Operations</p>
          <h2 className="book-title">Register New Tool</h2>
        </div>
      </div>

      <div className="compliance-card" style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '10px', borderRadius: '12px' }}>
                <Package size={24} />
            </div>
            <div>
                <h3 style={{ margin: 0 }}>Tool Details</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>Fill in the information below to add a new unit to the inventory.</p>
            </div>
        </div>
        
        <ToolForm 
          onCancel={() => {}} 
          onSubmit={() => {
              if (onComplete) onComplete();
          }} 
        />
      </div>
    </div>
  );
};

export default ToolRegistration;
