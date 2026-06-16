import React from 'react';
import { ShieldCheck, Users, HardHat, ChevronRight, Wrench } from 'lucide-react';
import './RoleSelection.css';

const TOOL_BRAND_IMAGE = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop';

const RoleSelection = ({ onRoleSelect, appSettings }) => {
  const roles = [
    {
      id: 'Admin',
      title: 'System Administrator',
      desc: 'Full access to financial records, inventory oversight, and global management.',
      icon: ShieldCheck,
      color: 'var(--accent)',
    },
    {
      id: 'Manager',
      title: 'Operations Manager',
      desc: 'Manage day-to-day tool bookings, client relations, and operational reports.',
      icon: Users,
      color: '#10B981',
    },
    {
      id: 'Employee',
      title: 'Staff Portal',
      desc: 'Track assignments, salary history, and individual job performance.',
      icon: HardHat,
      color: '#F59E0B',
    }
  ];

  return (
    <div className="gateway-layout">
      <div className="gateway-bg-decoration">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      
      <div className="gateway-content">
        <div className="gateway-header">
          <div className="gateway-tool-brand" aria-hidden="true">
            <img src={TOOL_BRAND_IMAGE} alt="" className="gateway-tool-photo" />
            <div className="gateway-tool-icon"><Wrench size={32} /></div>
          </div>
          <h1>{appSettings?.companyName || 'RAXWO'} <span>Tool Rentals</span></h1>
          <p>The Standard of Excellence in Equipment Management.</p>
        </div>

        <div className="gateway-grid">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div 
                key={role.id} 
                className="gateway-card" 
                onClick={() => onRoleSelect(role.id)}
                style={{ '--role-color': role.color }}
              >
                <div className="card-top">
                  <div className="gateway-icon-box">
                    <Icon size={32} />
                  </div>
                  <h3>{role.title}</h3>
                  <p>{role.desc}</p>
                </div>
                
                <div className="gateway-card-footer">
                  <span>Enter Dashboard</span>
                  <div className="action-circle">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="gateway-footer">
          <p>© {new Date().getFullYear()} {appSettings?.companyName || 'RAXWO International'}. Secure Gateway System.</p>
        </footer>
      </div>
    </div>
  );
};

export default RoleSelection;
