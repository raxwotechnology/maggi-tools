import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import './ConfirmModal.css';

const AlertModal = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  type = 'info', // 'error' | 'warning' | 'info' | 'success'
  onConfirm,
}) => {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onConfirm]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle />;
      case 'warning':
        return <AlertTriangle />;
      case 'success':
        return <CheckCircle2 />;
      default:
        return <Info />;
    }
  };

  const getDialogTypeClass = () => {
    if (type === 'error') return 'dialog-danger';
    if (type === 'warning') return 'dialog-warning';
    if (type === 'success') return 'dialog-success';
    return 'dialog-info';
  };

  const getConfirmBtnClass = () => {
    if (type === 'error') return 'dialog-btn-danger';
    if (type === 'warning') return 'dialog-btn-warning';
    return 'dialog-btn-confirm';
  };

  return ReactDOM.createPortal(
    <div className="raxwo-dialog-overlay" onClick={onConfirm} role="presentation">
      <div
        className={`raxwo-dialog ${getDialogTypeClass()}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-desc"
      >
        <div className="dialog-icon-circle">
          {getIcon()}
        </div>

        {title && (
          <h2 id="alert-dialog-title" className="dialog-title">
            {title}
          </h2>
        )}

        <div id="alert-dialog-desc" className="dialog-message">
          {message}
        </div>

        <div className="dialog-actions" style={{ maxWidth: '200px' }}>
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

export default AlertModal;
