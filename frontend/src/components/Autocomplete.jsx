import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import './Autocomplete.css';

const Autocomplete = ({
  options,
  value,
  onChange,
  placeholder,
  name,
  required = false,
  className = '',
  multiSelect = false,
  onOptionSelect = null,
  usePortal = true,
  emptyMessage = 'No matches found'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [userInput, setUserInput] = useState(value || '');
  const [menuStyle, setMenuStyle] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setUserInput(value || '');
  }, [value]);

  const filterOptions = (input) => {
    const q = (input || '').trim().toLowerCase();
    if (!q) return options.slice(0, 100);
    return options.filter(opt => (opt || '').toLowerCase().includes(q));
  };

  const updateMenuPosition = () => {
    if (!inputRef.current || !usePortal) return;
    const rect = inputRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
      zIndex: 12000,
      maxHeight: 'min(280px, 45vh)'
    });
  };

  useLayoutEffect(() => {
    if (isOpen && usePortal) {
      updateMenuPosition();
      const onScroll = () => updateMenuPosition();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      };
    }
  }, [isOpen, usePortal, suggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inContainer = containerRef.current?.contains(event.target);
      const inMenu = event.target.closest?.('.autocomplete-suggestions-portal');
      if (!inContainer && !inMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openWithOptions = (input) => {
    const filtered = filterOptions(input);
    setSuggestions(filtered);
    setIsOpen(filtered.length > 0 || options.length > 0);
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);
    onChange({ target: { name, value: input } });
    openWithOptions(input);
  };

  const handleSelect = (option) => {
    if (multiSelect && onOptionSelect) {
      onOptionSelect(option);
      setUserInput('');
      onChange({ target: { name, value: '' } });
      const next = filterOptions('');
      setSuggestions(next);
      setIsOpen(next.length > 0);
      return;
    }
    setUserInput(option);
    setIsOpen(false);
    onChange({ target: { name, value: option } });
  };

  const suggestionsList = (
    <ul
      className={`suggestions-list${usePortal ? ' autocomplete-suggestions-portal' : ''}`}
      style={usePortal ? menuStyle : undefined}
    >
      {suggestions.length > 0 ? (
        suggestions.map((opt, i) => (
          <li
            key={`${opt}-${i}`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(opt);
            }}
          >
            {opt}
          </li>
        ))
      ) : (
        <li className="no-suggestions">
          {options.length === 0 ? emptyMessage : 'No matches found'}
        </li>
      )}
    </ul>
  );

  return (
    <div className={`autocomplete-container ${className}`} ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={userInput}
        onChange={handleInputChange}
        onFocus={() => openWithOptions(userInput)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {isOpen && (
        usePortal
          ? ReactDOM.createPortal(suggestionsList, document.body)
          : suggestionsList
      )}
    </div>
  );
};

export default Autocomplete;
