import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './ToastContainer.css';

const ICON_MAP = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="raxwo-toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const IconComponent = ICON_MAP[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={`raxwo-toast toast-${toast.type || 'info'}${toast.exiting ? ' toast-exit' : ''}`}
            role="alert"
          >
            <div className="toast-icon">
              <IconComponent />
            </div>
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
            </div>
            <button
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X />
            </button>
            <div
              className="toast-progress"
              style={{ animationDuration: `${toast.duration || 4000}ms` }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
