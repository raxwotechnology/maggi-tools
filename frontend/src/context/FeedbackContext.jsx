import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { bus, confirmDialog, alertDialog, toast } from '../utils/feedback';
import ConfirmModal from '../components/common/ConfirmModal';
import AlertModal from '../components/common/AlertModal';
import ToastContainer from '../components/common/ToastContainer';

const FeedbackContext = createContext(null);

export const FeedbackProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState(null);
  const [alertState, setAlertState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(1);

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback(({ type = 'info', message, duration = 3500 }) => {
    const id = toastIdRef.current++;
    const newToast = { id, type, message, duration };
    setToasts((prev) => [...prev.slice(-4), newToast]); // keep at most 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
    return id;
  }, [dismissToast]);

  useEffect(() => {
    const unsubscribe = bus.subscribe((eventType, payload) => {
      if (eventType === 'confirm') {
        setConfirmState(payload);
      } else if (eventType === 'alert') {
        setAlertState(payload);
      } else if (eventType === 'toast') {
        addToast(payload);
      }
    });

    return unsubscribe;
  }, [addToast]);

  const handleConfirmAction = useCallback((confirmed) => {
    if (confirmState?.resolve) {
      confirmState.resolve(confirmed);
    }
    setConfirmState(null);
  }, [confirmState]);

  const handleAlertAction = useCallback(() => {
    if (alertState?.resolve) {
      alertState.resolve();
    }
    setAlertState(null);
  }, [alertState]);

  const contextValue = {
    confirm: confirmDialog,
    alert: alertDialog,
    toast,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={!!confirmState}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          type={confirmState.type || 'primary'}
          onConfirm={() => handleConfirmAction(true)}
          onCancel={() => handleConfirmAction(false)}
        />
      )}

      {/* Alert Modal */}
      {alertState && (
        <AlertModal
          isOpen={!!alertState}
          title={alertState.title}
          message={alertState.message}
          confirmText={alertState.confirmText}
          type={alertState.type || 'info'}
          onConfirm={handleAlertAction}
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    // Fallback if used outside Provider
    return {
      confirm: confirmDialog,
      alert: alertDialog,
      toast,
    };
  }
  return ctx;
};
