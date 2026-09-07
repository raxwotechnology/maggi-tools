import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Trash2, AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary', // 'danger' | 'warning' | 'info' | 'primary'
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto focus confirm button for keyboard accessibility
      const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 />;
      case 'warning':
        return <AlertTriangle />;
      case 'success':
        return <CheckCircle2 />;
      default:
        return <HelpCircle />;
    }
  };

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger':
        return 'dialog-btn-danger';
      case 'warning':
        return 'dialog-btn-warning';
      default:
        return 'dialog-btn-confirm';
    }
  };

  return ReactDOM.createPortal(
    <div className="raxwo-dialog-overlay" onClick={onCancel} role="presentation">
      <div
        className={`raxwo-dialog dialog-${type}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <div className="dialog-icon-circle">
          {getIcon()}
        </div>

        {title && (
          <h2 id="confirm-dialog-title" className="dialog-title">
            {title}
          </h2>
        )}

        <div id="confirm-dialog-desc" className="dialog-message">
          {message}
        </div>

        <div className="dialog-actions">
          <button
            type="button"
            className="dialog-btn dialog-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`dialog-btn ${getConfirmBtnClass()}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
