// Universal Feedback Dispatcher (supports both React components & non-React files like PDF utilities)

class FeedbackBus {
  constructor() {
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(type, payload) {
    this.listeners.forEach(listener => {
      try {
        listener(type, payload);
      } catch (err) {
        console.error('Feedback bus error:', err);
      }
    });
  }
}

export const bus = new FeedbackBus();

/**
 * Trigger a confirmation modal anywhere.
 * @param {string | { title?: string, message: string, confirmText?: string, cancelText?: string, type?: 'danger' | 'warning' | 'info' | 'primary' }} options
 * @returns {Promise<boolean>}
 */
export const confirmDialog = (options) => {
  const payload = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    bus.emit('confirm', { ...payload, resolve });
  });
};

/**
 * Trigger an acknowledgment alert modal anywhere.
 * @param {string | { title?: string, message: string, confirmText?: string, type?: 'error' | 'warning' | 'info' | 'success' }} options
 * @returns {Promise<void>}
 */
export const alertDialog = (options) => {
  const payload = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    bus.emit('alert', { ...payload, resolve });
  });
};

/**
 * Trigger toast notifications anywhere.
 */
export const toast = {
  success: (message, duration = 3500) => {
    bus.emit('toast', { type: 'success', message, duration });
  },
  error: (message, duration = 4500) => {
    bus.emit('toast', { type: 'error', message, duration });
  },
  warning: (message, duration = 4000) => {
    bus.emit('toast', { type: 'warning', message, duration });
  },
  info: (message, duration = 3500) => {
    bus.emit('toast', { type: 'info', message, duration });
  },
};
