import React from 'react';
import './ToolFilter.css';

const ToolFilter = ({ tools, selectedTool, onSelect }) => {
  return (
    <div className="tool-filter-container">
      <div className="filter-scroll">
        <button 
          className={`filter-pill ${!selectedTool ? 'active' : ''}`}
          onClick={() => onSelect(null)}
        >
          All Tools
        </button>
        {tools.map((t, i) => (
          <button 
            key={t._id || i}
            className={`filter-pill ${selectedTool === t.number ? 'active' : ''}`}
            onClick={() => onSelect(t.number)}
          >
            {t.number}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToolFilter;
