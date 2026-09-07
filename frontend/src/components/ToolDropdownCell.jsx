import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { Package, ChevronDown, X, Search, ExternalLink } from 'lucide-react';
import './ToolDropdownCell.css';

const ToolDropdownCell = ({ record, onViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [popoverStyle, setPopoverStyle] = useState({});

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Normalize list of tools from record
  const items = useMemo(() => {
    if (record?.items && Array.isArray(record.items) && record.items.length > 0) {
      return record.items.map((it, idx) => ({
        id: it._id || idx,
        toolNumber: it.toolNumber || it.toolNo || '—',
        model: it.model || it.name || '',
        category: it.category || '',
        dailyRate: it.dailyRate,
        quantity: it.quantity || 1,
        returnStatus: it.returnStatus
      }));
    }

    if (record?.tool) {
      if (typeof record.tool === 'object') {
        return [{
          id: record.tool._id || 0,
          toolNumber: record.tool.number || record.toolNo || 'Tool',
          model: record.tool.model || '',
          category: record.tool.category || '',
          dailyRate: record.tool.dailyRate || record.dailyRate,
          quantity: record.quantity || 1
        }];
      }
      return [{
        id: 0,
        toolNumber: record.toolNo || String(record.tool),
        model: record.toolModel || '',
        category: record.toolCategory || '',
        dailyRate: record.dailyRate,
        quantity: record.quantity || 1
      }];
    }

    if (record?.toolNo) {
      return [{
        id: 0,
        toolNumber: record.toolNo,
        model: record.toolModel || '',
        category: record.toolCategory || '',
        dailyRate: record.dailyRate,
        quantity: 1
      }];
    }

    return [];
  }, [record]);

  // Calculate coordinates relative to trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 330;
    
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }
    if (left < 16) left = 16;

    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setPopoverStyle({
      position: 'fixed',
      top: opensUpward ? undefined : `${rect.bottom + 6}px`,
      bottom: opensUpward ? `${window.innerHeight - rect.top + 6}px` : undefined,
      left: `${left}px`,
      width: `${dropdownWidth}px`,
      zIndex: 99999
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFilterQuery('');
      return;
    }

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Filtered tools
  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return items;
    const q = filterQuery.toLowerCase().trim();
    return items.filter(it => 
      it.toolNumber.toLowerCase().includes(q) ||
      it.model.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q)
    );
  }, [items, filterQuery]);

  // If no tools
  if (items.length === 0) {
    return <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>—</span>;
  }

  // If single tool: render a compact tag
  if (items.length === 1) {
    const single = items[0];
    return (
      <div 
        className="tool-single-pill" 
        title={single.model ? `${single.toolNumber} — ${single.model}` : single.toolNumber}
      >
        <Package size={13} className="tool-pill-icon" />
        <span className="tool-pill-number">{single.toolNumber}</span>
        {single.model && (
          <span className="tool-pill-model">{single.model}</span>
        )}
      </div>
    );
  }

  // Multiple tools: render interactive dropdown trigger
  return (
    <div className="tool-dropdown-container">
      <button
        ref={triggerRef}
        type="button"
        className={`tool-dropdown-btn ${isOpen ? 'is-open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        title={`Click to inspect all ${items.length} tools`}
      >
        <Package size={14} className="tool-btn-icon" />
        <span className="tool-btn-count">{items.length} Tools</span>
        <ChevronDown size={14} className={`tool-btn-chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && ReactDOM.createPortal(
        <div
          ref={popoverRef}
          className="tool-popover-portal"
          style={popoverStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="tool-popover-header">
            <div className="tool-popover-header-left">
              <Package size={15} color="var(--accent, #4f46e5)" />
              <span className="tool-popover-title">Reserved Tools</span>
              <span className="tool-popover-badge">{items.length}</span>
            </div>
            <button
              type="button"
              className="tool-popover-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Search box if 4 or more tools */}
          {items.length >= 4 && (
            <div className="tool-popover-search-box">
              <Search size={14} className="tool-popover-search-icon" />
              <input
                type="text"
                autoFocus
                placeholder="Search tool ID or model..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
              {filterQuery && (
                <button
                  type="button"
                  className="tool-popover-close-btn"
                  onClick={() => setFilterQuery('')}
                  style={{ width: '18px', height: '18px' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* List of items */}
          <div className="tool-popover-list">
            {filteredItems.length === 0 ? (
              <div className="tool-popover-empty">
                No tools match &ldquo;{filterQuery}&rdquo;
              </div>
            ) : (
              filteredItems.map((it, idx) => (
                <div key={it.id || idx} className="tool-popover-item">
                  <div className="tool-item-info">
                    <div className="tool-item-primary">
                      <span className="tool-item-tag">{it.toolNumber}</span>
                      {it.model && <span className="tool-item-model" title={it.model}>{it.model}</span>}
                    </div>
                    {it.category && (
                      <span className="tool-item-sub">{it.category}</span>
                    )}
                  </div>
                  <div className="tool-item-meta">
                    {it.quantity > 1 && (
                      <span className="tool-item-qty">Qty: {it.quantity}</span>
                    )}
                    {it.dailyRate !== undefined && it.dailyRate > 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                        LKR {Number(it.dailyRate).toLocaleString()}/d
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {onViewDetails && (
            <div className="tool-popover-footer">
              <button
                type="button"
                className="tool-popover-view-btn"
                onClick={() => {
                  setIsOpen(false);
                  onViewDetails();
                }}
              >
                <span>View Full Details</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ToolDropdownCell;
